import { useEffect, useRef, useState } from "react";
import { useModal } from "@/components/useModal";
import { InlineError } from "@/components/WineBits";
import { PHOTO_KINDS, type CropRect, type PhotoKind } from "@/lib/photos";

type Props = {
  bitmap: ImageBitmap;
  fileName: string;
  onCancel: () => void;
  onRetake: () => void;
  onConfirm: (crop: CropRect, kind: PhotoKind) => void;
};

/** A fixed 2:3 frame over the shot. The member pans and zooms; the ratio never changes. */
export function PhotoCropSheet({ bitmap, onCancel, onRetake, onConfirm }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModal(dialogRef, onCancel);
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [kind, setKind] = useState<PhotoKind>("front");
  const [error] = useState<string | null>(null);
  const url = useRef<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob || cancelled) return;
        url.current = URL.createObjectURL(blob);
        setSrc(url.current);
      },
      "image/jpeg",
      0.9,
    );
    return () => {
      cancelled = true;
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, [bitmap]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setFrame({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const base = frame.w ? Math.max(frame.w / bitmap.width, frame.h / bitmap.height) : 1;
  const scale = base * zoom;
  const dw = bitmap.width * scale;
  const dh = bitmap.height * scale;

  function clamp(next: { x: number; y: number }) {
    return {
      x: Math.min(0, Math.max(frame.w - dw, next.x)),
      y: Math.min(0, Math.max(frame.h - dh, next.y)),
    };
  }

  // Centre the shot once the frame has a real size (early measurements can be 0 wide or 0
  // tall, which used to pin the photo to its edge), then only re-clamp on zoom or resize.
  const centred = useRef(false);
  useEffect(() => {
    if (!frame.w || !frame.h) return;
    // The flag lives outside the updater: React may call updaters twice, so they stay pure.
    if (!centred.current) {
      centred.current = true;
      setOffset({ x: (frame.w - dw) / 2, y: (frame.h - dh) / 2 });
      return;
    }
    setOffset((prev) => ({
      x: Math.min(0, Math.max(frame.w - dw, prev.x)),
      y: Math.min(0, Math.max(frame.h - dh, prev.y)),
    }));
  }, [frame.w, frame.h, dw, dh]);

  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  function confirm() {
    const crop: CropRect = {
      x: Math.max(0, -offset.x / scale),
      y: Math.max(0, -offset.y / scale),
      width: Math.min(bitmap.width, frame.w / scale),
      height: Math.min(bitmap.height, frame.h / scale),
    };
    onConfirm(crop, kind);
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Position the photograph"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          onClick={onCancel}
          className="tap text-sm text-muted-foreground underline underline-offset-4"
        >
          Cancel
        </button>
        <p className="eyebrow">Position the bottle</p>
        <button
          onClick={onRetake}
          className="tap text-sm text-muted-foreground underline underline-offset-4"
        >
          Retake
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
        <div
          ref={frameRef}
          className="relative w-full max-w-[min(72vw,320px)] touch-none overflow-hidden bg-card"
          style={{ aspectRatio: "2 / 3" }}
          tabIndex={0}
          role="group"
          aria-label="Photograph framing. Drag, or use the arrow keys, to move the photo."
          onKeyDown={(e) => {
            const step = e.shiftKey ? 40 : 10;
            const move = {
              ArrowLeft: [step, 0],
              ArrowRight: [-step, 0],
              ArrowUp: [0, step],
              ArrowDown: [0, -step],
            }[e.key];
            if (!move) return;
            e.preventDefault();
            setOffset(clamp({ x: offset.x + move[0]!, y: offset.y + move[1]! }));
          }}
          onPointerDown={(e) => {
            drag.current = { id: e.pointerId, x: e.clientX - offset.x, y: e.clientY - offset.y };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            setOffset(clamp({ x: e.clientX - d.x, y: e.clientY - d.y }));
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          {src ? (
            <img
              src={src}
              alt=""
              draggable={false}
              className="max-w-none select-none"
              style={{ position: "absolute", left: offset.x, top: offset.y, width: dw, height: dh }}
            />
          ) : null}
        </div>
      </div>

      <div className="space-y-4 border-t border-border px-4 py-4">
        <label className="block">
          <span className="eyebrow">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--color-gold)]"
            aria-label="Zoom"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {PHOTO_KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className="chip"
              style={{ minHeight: 44 }}
              data-on={kind === k.value}
              aria-pressed={kind === k.value}
            >
              {k.label}
            </button>
          ))}
        </div>

        {error ? <InlineError>{error}</InlineError> : null}

        <button
          onClick={confirm}
          disabled={!frame.w}
          className="btn-gold w-full"
          style={{ background: "rgba(201,169,97,.12)" }}
        >
          Use this photo
        </button>
      </div>
    </div>
  );
}
