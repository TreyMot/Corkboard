const STAR =
  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

const fill = (value: number, i: number) => `${Math.max(0, Math.min(1, value - i)) * 100}%`;

function Star({ value, i, size }: { value: number; i: number; size: number }) {
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      <span
        className="absolute inset-0"
        style={{ background: "var(--color-dim)", clipPath: STAR }}
      />
      <span
        className="absolute top-0 left-0 overflow-hidden"
        style={{ height: size, width: fill(value, i) }}
      >
        <span className="block bg-gold" style={{ width: size, height: size, clipPath: STAR }} />
      </span>
    </span>
  );
}

/** Star marks, filled to the half. Zero shows five empty stars. */
export function Stars({ value, size = 10 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center align-middle" style={{ gap: size > 14 ? 5 : 3 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} value={value} i={i} size={size} />
      ))}
      <span className="sr-only">{value > 0 ? `${value} of 5` : "Not rated"}</span>
    </span>
  );
}

export function ratingLabel(value: number | null | undefined) {
  return value && value > 0 ? value.toFixed(1) : "–";
}

/** Half-step picker: the left half of a star sets .5, the right half the whole. */
export function StarPicker({
  value,
  onChange,
  invalid,
}: {
  value: number | null;
  onChange: (value: number) => void;
  invalid?: boolean;
}) {
  const v = value ?? 0;
  return (
    <div>
      <div
        className="flex items-center"
        style={{
          outline: invalid ? "1px solid var(--color-destructive)" : undefined,
          outlineOffset: 4,
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          // 48px slot: each half is a 24x44 target (WCAG 2.2 minimum), the star still draws at 30px.
          <span key={i} className="relative block" style={{ width: 48, height: 44 }}>
            <span className="absolute" style={{ top: 7, left: 9 }}>
              <Star value={v} i={i} size={30} />
            </span>
            {[0.5, 1].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => onChange(i + step)}
                aria-label={`Rate ${i + step} of 5`}
                aria-pressed={v === i + step}
                className="absolute top-0 h-11 w-6 cursor-pointer border-0 bg-transparent"
                style={{ left: step === 1 ? 24 : 0 }}
              />
            ))}
          </span>
        ))}
        <span
          className="font-display text-foreground tabular-nums"
          style={{ fontSize: 26, marginLeft: 10 }}
          aria-live="polite"
        >
          {ratingLabel(value)}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-quiet">Tap the left or right of a star for half steps.</p>
    </div>
  );
}
