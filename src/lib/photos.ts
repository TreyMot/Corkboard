import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "entry-photos";

export type EntryType = "rating" | "wishlist";
export type PhotoKind = "front" | "back" | "pour" | "shelf" | "other";

export const PHOTO_KINDS: { value: PhotoKind; label: string }[] = [
  { value: "front", label: "Front label" },
  { value: "back", label: "Back label" },
  { value: "pour", label: "Pour" },
  { value: "shelf", label: "Shelf or menu" },
  { value: "other", label: "Other" },
];

export type EntryPhoto = {
  id: string;
  rating_id: string | null;
  wishlist_item_id: string | null;
  owner_id: string;
  storage_path: string;
  thumb_path: string;
  kind: PhotoKind;
  is_primary: boolean;
  width: number | null;
  height: number | null;
  bytes: number | null;
  created_at: string;
};

export type CropRect = { x: number; y: number; width: number; height: number };

const FULL_LONG_EDGE = 1200;
const THUMB_W = 400;
const THUMB_H = 600;

export class DecodeError extends Error {}

function entryColumn(type: EntryType) {
  return type === "rating" ? "rating_id" : "wishlist_item_id";
}

// ---------------------------------------------------------------------------
// Client-side processing. Order matters: orientation, crop, canvas re-encode.
// The canvas re-encode is what strips GPS, device and timestamp metadata.
// ---------------------------------------------------------------------------

/** HEIC by MIME type, extension, or the ISO box brand (browsers often report no type). */
async function looksLikeHeic(file: File) {
  if (/image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) return true;
  const brand = new TextDecoder().decode(await file.slice(4, 12).arrayBuffer());
  return /^ftyp(heic|heix|hevc|hevx|heim|heis|mif1|msf1)/.test(brand);
}

/**
 * Profile photo as a JPEG re-drawn on a canvas, long edge 800px. The redraw drops EXIF, so
 * a phone photo's GPS location and camera details never reach storage. HEIC works too.
 */
export async function avatarJpeg(file: File): Promise<Blob> {
  const bitmap = await decodeFile(file);
  const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
  const canvas = drawCrop(
    bitmap,
    { x: 0, y: 0, width: bitmap.width, height: bitmap.height },
    bitmap.width * scale,
    bitmap.height * scale,
  );
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new Error("This image couldn't be prepared.");
  return blob;
}

export async function decodeFile(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Safari decodes HEIC natively and iPhones usually hand the page a JPEG already, but
    // Chrome and Firefox can't read iPhone photos copied to a computer. Convert those,
    // loading the ~3 MB decoder only when it's needed.
    if (await looksLikeHeic(file)) {
      try {
        const { heicTo } = await import("heic-to/csp");
        return await heicTo({ blob: file, type: "bitmap" });
      } catch (error) {
        console.error("[photos] HEIC conversion failed", error);
      }
    }
    const name = file.type || file.name.split(".").pop() || "unknown";
    throw new DecodeError(
      `That image format (${name}) can't be read in the browser. Save it as JPEG, PNG or WebP and try again.`,
    );
  }
}

type Encoded = { blob: Blob; ext: string; type: string; width: number; height: number };

async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Encoded> {
  const webp = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  if (webp)
    return {
      blob: webp,
      ext: "webp",
      type: "image/webp",
      width: canvas.width,
      height: canvas.height,
    };
  const jpeg = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!jpeg) throw new Error("This image couldn't be prepared for upload.");
  return { blob: jpeg, ext: "jpg", type: "image/jpeg", width: canvas.width, height: canvas.height };
}

function drawCrop(source: ImageBitmap, crop: CropRect, outW: number, outH: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(outW);
  canvas.height = Math.round(outH);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't prepare the image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function processImage(bitmap: ImageBitmap, crop: CropRect) {
  // 2:3 output. Long edge is the height.
  const fullH = Math.min(FULL_LONG_EDGE, Math.round(crop.height));
  const fullW = Math.round((fullH * 2) / 3);
  const full = await encode(drawCrop(bitmap, crop, fullW, (fullW * 3) / 2), 0.82);
  const thumb = await encode(drawCrop(bitmap, crop, THUMB_W, THUMB_H), 0.75);
  return { full, thumb };
}

/** The largest centred 2:3 frame in the shot: the tile crop for a label photo taken while logging. */
export function centreCrop(bitmap: ImageBitmap): CropRect {
  const width = Math.min(bitmap.width, (bitmap.height * 2) / 3);
  const height = (width * 3) / 2;
  return { x: (bitmap.width - width) / 2, y: (bitmap.height - height) / 2, width, height };
}

/** Whole shot as base64 JPEG for the label read. 1568px is the useful ceiling for vision input. */
export async function labelImageBase64(bitmap: ImageBitmap): Promise<string> {
  const scale = Math.min(1, 1568 / Math.max(bitmap.width, bitmap.height));
  const canvas = drawCrop(
    bitmap,
    { x: 0, y: 0, width: bitmap.width, height: bitmap.height },
    bitmap.width * scale,
    bitmap.height * scale,
  );
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new Error("This image couldn't be prepared.");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

const PHOTO_COLS =
  "id,rating_id,wishlist_item_id,owner_id,storage_path,thumb_path,kind,is_primary,width,height,bytes,created_at";

export async function getEntryPhotos(type: EntryType, entryId: string): Promise<EntryPhoto[]> {
  const { data, error } = await supabase
    .from("entry_photos_active")
    .select(PHOTO_COLS)
    .eq(entryColumn(type), entryId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as EntryPhoto[];
}

/** Primary photo thumb path for many entries at once. */
export async function getPrimaryThumbPaths(type: EntryType, entryIds: string[]) {
  const map = new Map<string, string>();
  if (!entryIds.length) return map;
  const column = entryColumn(type);
  const { data, error } = await supabase
    .from("entry_photos_active")
    .select(`${column},thumb_path`)
    .in(column, entryIds)
    .eq("is_primary", true);
  if (error) throw error;
  for (const row of (data ?? []) as unknown as Record<string, string>[]) {
    const key = row[column];
    if (key) map.set(key, row["thumb_path"]!);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Signed URLs, batched and cached for their lifetime
// ---------------------------------------------------------------------------

const TTL_SECONDS = 60 * 60;
const cache = new Map<string, { url: string; expires: number }>();

export async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const now = Date.now();
  const out = new Map<string, string>();
  const missing: string[] = [];
  for (const path of new Set(paths)) {
    const hit = cache.get(path);
    if (hit && hit.expires > now) out.set(path, hit.url);
    else missing.push(path);
  }
  if (missing.length) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(missing, TTL_SECONDS);
    if (error) throw error;
    for (const row of data ?? []) {
      if (!row.signedUrl || !row.path) continue;
      cache.set(row.path, { url: row.signedUrl, expires: now + (TTL_SECONDS - 60) * 1000 });
      out.set(row.path, row.signedUrl);
    }
  }
  return out;
}

export async function signPath(path: string) {
  return (await signPaths([path])).get(path) ?? null;
}

/** Thumb URLs for a page of entries: one signing request for the whole page. */
export async function getPrimaryThumbUrls(type: EntryType, entryIds: string[]) {
  const paths = await getPrimaryThumbPaths(type, entryIds);
  const signed = await signPaths([...paths.values()]);
  const out = new Map<string, string>();
  for (const [entryId, path] of paths) {
    const url = signed.get(path);
    if (url) out.set(entryId, url);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function uploadPhoto(input: {
  type: EntryType;
  entryId: string;
  ownerId: string;
  bitmap: ImageBitmap;
  crop: CropRect;
  kind: PhotoKind;
  makePrimary: boolean;
}): Promise<EntryPhoto> {
  const { full, thumb } = await processImage(input.bitmap, input.crop);
  const photoId = crypto.randomUUID();
  const base = `entries/${input.entryId}/${photoId}`;
  const storagePath = `${base}.${full.ext}`;
  const thumbPath = `${base}_thumb.${thumb.ext}`;

  const uploaded: string[] = [];
  try {
    for (const [path, encoded] of [
      [storagePath, full],
      [thumbPath, thumb],
    ] as const) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, encoded.blob, { contentType: encoded.type, upsert: false });
      if (error) throw error;
      uploaded.push(path);
    }

    const { data, error } = await supabase
      .from("entry_photos")
      .insert({
        id: photoId,
        rating_id: input.type === "rating" ? input.entryId : null,
        wishlist_item_id: input.type === "wishlist" ? input.entryId : null,
        owner_id: input.ownerId,
        storage_path: storagePath,
        thumb_path: thumbPath,
        kind: input.kind,
        is_primary: input.makePrimary,
        width: full.width,
        height: full.height,
        bytes: full.blob.size,
      })
      .select(PHOTO_COLS)
      .single();
    if (error) throw error;
    return data as unknown as EntryPhoto;
  } catch (error) {
    if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
    throw error;
  }
}

export async function setPrimary(type: EntryType, entryId: string, photoId: string) {
  const column = entryColumn(type);
  const clear = await supabase
    .from("entry_photos")
    .update({ is_primary: false })
    .eq(column, entryId)
    .eq("is_primary", true)
    .is("deleted_at", null);
  if (clear.error) throw clear.error;
  const { error } = await supabase
    .from("entry_photos")
    .update({ is_primary: true })
    .eq("id", photoId);
  if (error) throw error;
}

export async function setKind(photoId: string, kind: PhotoKind) {
  const { error } = await supabase.from("entry_photos").update({ kind }).eq("id", photoId);
  if (error) throw error;
}

/** Soft delete. If the photo was primary, the next remaining photo takes over. */
export async function removePhoto(type: EntryType, entryId: string, photo: EntryPhoto) {
  const { error } = await supabase
    .from("entry_photos")
    .update({ deleted_at: new Date().toISOString(), is_primary: false })
    .eq("id", photo.id);
  if (error) throw error;
  if (photo.is_primary) {
    const rest = await getEntryPhotos(type, entryId);
    const next = rest[0];
    if (next) await setPrimary(type, entryId, next.id);
  }
}

export async function restorePhoto(type: EntryType, entryId: string, photo: EntryPhoto) {
  const { error } = await supabase
    .from("entry_photos")
    .update({ deleted_at: null })
    .eq("id", photo.id);
  if (error) throw error;
  if (photo.is_primary) await setPrimary(type, entryId, photo.id);
}
