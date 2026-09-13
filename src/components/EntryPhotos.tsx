import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PhotoCropSheet } from "@/components/PhotoCropSheet";
import { useModal } from "@/components/useModal";
import { InlineError } from "@/components/WineBits";
import {
  DecodeError,
  decodeFile,
  getEntryPhotos,
  PHOTO_KINDS,
  removePhoto,
  restorePhoto,
  setKind as saveKind,
  setPrimary,
  signPath,
  signPaths,
  uploadPhoto,
  type CropRect,
  type EntryPhoto,
  type EntryType,
  type PhotoKind,
} from "@/lib/photos";

type Pending = {
  previewUrl: string;
  bitmap: ImageBitmap;
  crop: CropRect;
  kind: PhotoKind;
  makePrimary: boolean;
  error: string | null;
};

export function EntryPhotos({
  type,
  entryId,
  ownerId,
  canEdit,
  fallback,
}: {
  type: EntryType;
  entryId: string;
  ownerId: string;
  canEdit: boolean;
  fallback: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const key = ["entry-photos", type, entryId];
  const photos = useQuery({ queryKey: key, queryFn: () => getEntryPhotos(type, entryId) });
  const rows = photos.data ?? [];

  const urls = useQuery({
    queryKey: ["entry-photo-thumbs", type, entryId, rows.map((p) => p.id).join(",")],
    queryFn: () => signPaths(rows.map((p) => p.thumb_path)),
    enabled: rows.length > 0,
  });

  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [decodeMessage, setDecodeMessage] = useState<string | null>(null);
  const [openPhoto, setOpenPhoto] = useState<EntryPhoto | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  async function pick(file: File) {
    setDecodeMessage(null);
    try {
      setBitmap(await decodeFile(file));
    } catch (error) {
      setDecodeMessage(
        error instanceof DecodeError ? error.message : "That image couldn't be read.",
      );
    }
  }

  async function run(job: Pending) {
    try {
      await uploadPhoto({
        type,
        entryId,
        ownerId,
        bitmap: job.bitmap,
        crop: job.crop,
        kind: job.kind,
        makePrimary: job.makePrimary,
      });
      job.bitmap.close?.();
      URL.revokeObjectURL(job.previewUrl);
      setPending(null);
      await refresh();
    } catch {
      setPending({ ...job, error: "Upload failed." });
    }
  }

  async function confirmCrop(crop: CropRect, kind: PhotoKind) {
    if (!bitmap) return;
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 600;
    canvas
      .getContext("2d")
      ?.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, 400, 600);
    const previewUrl = canvas.toDataURL("image/jpeg", 0.7);
    const job: Pending = {
      previewUrl,
      bitmap,
      crop,
      kind,
      makePrimary: rows.length === 0,
      error: null,
    };
    setBitmap(null);
    setPending(job);
    await run(job);
  }

  async function onDelete(photo: EntryPhoto) {
    try {
      await removePhoto(type, entryId, photo);
      await refresh();
      toast("Photo removed", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            void restorePhoto(type, entryId, photo).then(refresh);
          },
        },
      });
    } catch {
      toast("That didn't go through. Try again?");
    }
  }

  const primary = rows.find((p) => p.is_primary) ?? rows[0] ?? null;
  const others = rows.filter((p) => p.id !== primary?.id);
  const map = urls.data;

  return (
    <section>
      <p className="caps m-0">Photographs</p>

      <div className="mt-3 w-full max-w-[400px]">
        {pending ? (
          <div
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: "2 / 3", borderRadius: 0 }}
          >
            <img
              src={pending.previewUrl}
              alt="Photograph being uploaded"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-background/85 p-2 text-center">
              {pending.error ? (
                <div className="space-y-1">
                  <p className="text-[11px] text-destructive">{pending.error}</p>
                  <button
                    onClick={() => void run({ ...pending, error: null })}
                    className="tap text-[11px] underline underline-offset-4"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Uploading…</p>
              )}
            </div>
          </div>
        ) : primary ? (
          <button onClick={() => setOpenPhoto(primary)} className="block w-full">
            <span
              className="relative block w-full overflow-hidden"
              style={{ aspectRatio: "2 / 3", borderRadius: 0 }}
            >
              {map?.get(primary.thumb_path) ? (
                <img
                  src={map.get(primary.thumb_path)}
                  alt={`Open the ${kindLabel(primary.kind)} photograph full size`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="block h-full w-full animate-pulse bg-card" />
              )}
            </span>
          </button>
        ) : (
          <div className="w-full overflow-hidden" style={{ aspectRatio: "2 / 3", borderRadius: 0 }}>
            {fallback}
          </div>
        )}
      </div>

      {others.length ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {others.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setOpenPhoto(photo)}
              className="w-[64px] shrink-0 overflow-hidden"
              style={{ aspectRatio: "2 / 3" }}
            >
              {map?.get(photo.thumb_path) ? (
                <img
                  src={map.get(photo.thumb_path)}
                  alt={`Open the ${kindLabel(photo.kind)} photograph full size`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="block h-full w-full animate-pulse bg-card" />
              )}
            </button>
          ))}
        </div>
      ) : null}

      {canEdit ? (
        <div className="mt-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void pick(file);
            }}
          />
          <button onClick={() => inputRef.current?.click()} className="btn-quiet">
            Add a photograph
          </button>
          {decodeMessage ? <InlineError>{decodeMessage}</InlineError> : null}
        </div>
      ) : null}

      {canEdit && rows.length ? (
        <ul className="mt-5 space-y-3">
          {rows.map((photo) => (
            <li
              key={photo.id}
              className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm"
            >
              <select
                value={photo.kind}
                onChange={(e) => {
                  void saveKind(photo.id, e.target.value as PhotoKind).then(refresh);
                }}
                className="tap rounded-[2px] border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                aria-label="Photo kind"
              >
                {PHOTO_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
              {photo.is_primary ? (
                <span className="text-[11px] tracking-[0.16em] text-gold uppercase">Main</span>
              ) : (
                <button
                  onClick={() => {
                    void setPrimary(type, entryId, photo.id).then(refresh);
                  }}
                  className="tap text-muted-foreground underline underline-offset-4"
                >
                  Set as main
                </button>
              )}
              <button
                onClick={() => void onDelete(photo)}
                className="tap ml-auto text-muted-foreground underline underline-offset-4"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {bitmap ? (
        <PhotoCropSheet
          bitmap={bitmap}
          fileName=""
          onCancel={() => setBitmap(null)}
          onRetake={() => {
            setBitmap(null);
            inputRef.current?.click();
          }}
          onConfirm={(crop, kind) => void confirmCrop(crop, kind)}
        />
      ) : null}

      {openPhoto ? <FullSize photo={openPhoto} onClose={() => setOpenPhoto(null)} /> : null}
    </section>
  );
}

function kindLabel(kind: PhotoKind) {
  return (PHOTO_KINDS.find((k) => k.value === kind)?.label ?? "bottle").toLowerCase();
}

function FullSize({ photo, onClose }: { photo: EntryPhoto; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModal(dialogRef, onClose);
  useEffect(() => {
    let live = true;
    void signPath(photo.storage_path).then((value) => {
      if (live) setUrl(value);
    });
    return () => {
      live = false;
    };
  }, [photo.storage_path]);

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photograph, full size"
      className="fixed inset-0 z-50 flex flex-col bg-background/98"
    >
      <div className="flex justify-end p-4">
        <button
          onClick={onClose}
          className="tap text-sm text-muted-foreground underline underline-offset-4"
        >
          Close
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {url ? (
          <img
            src={url}
            alt={`The ${kindLabel(photo.kind)} photograph`}
            className="max-h-full max-w-full object-contain"
            style={{ borderRadius: 0 }}
          />
        ) : (
          <div className="h-40 w-[100px] animate-pulse bg-card" />
        )}
      </div>
    </div>,
    document.body,
  );
}
