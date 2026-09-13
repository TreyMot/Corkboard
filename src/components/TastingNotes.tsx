import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useModal } from "@/components/useModal";
import { colourInfo, type Colour } from "@/lib/rim";
import { MAX_TASTING_NOTES, TASTING } from "@/lib/tasting";

/** Chosen notes as quiet chips. Pass onChange to let the member pick from the style's list. */
export function TastingNotes({
  style,
  value,
  onChange,
  labelId,
}: {
  style: Colour;
  value: string[];
  onChange?: (notes: string[]) => void;
  /** id of the visible label, so the chips and button are announced with it. */
  labelId?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col" style={{ gap: 10 }} aria-labelledby={labelId} role="group">
      {value.length ? (
        <ul className="m-0 flex list-none flex-wrap p-0" style={{ gap: 6 }}>
          {value.map((note) => (
            <li
              key={note}
              className="border text-foreground"
              style={{
                borderColor: "var(--color-input)",
                borderRadius: 3,
                padding: "5px 10px",
                fontSize: 12.5,
              }}
            >
              {note}
            </li>
          ))}
        </ul>
      ) : onChange ? null : (
        <p className="m-0 text-quiet" style={{ fontSize: 13 }}>
          No tasting notes yet.
        </p>
      )}
      {onChange ? (
        <button type="button" className="btn-quiet self-start" onClick={() => setOpen(true)}>
          {value.length ? "Change tasting notes" : "Add tasting notes"}
        </button>
      ) : null}
      {open && onChange ? (
        <TastingSheet
          style={style}
          initial={value}
          onDone={(notes) => {
            onChange(notes);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function TastingSheet({
  style,
  initial,
  onDone,
  onClose,
}: {
  style: Colour;
  initial: string[];
  onDone: (notes: string[]) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModal(ref, onClose);
  const [picked, setPicked] = useState(initial);
  const [filter, setFilter] = useState("");
  const term = filter.trim().toLowerCase();
  const groups = TASTING[style]
    .map((g) => ({ ...g, notes: g.notes.filter((n) => n.toLowerCase().includes(term)) }))
    .filter((g) => g.notes.length);
  const full = picked.length >= MAX_TASTING_NOTES;
  const toggle = (note: string) =>
    setPicked((p) => (p.includes(note) ? p.filter((n) => n !== note) : [...p, note]));

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tasting-title"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div
        className="flex items-center justify-between border-b border-border"
        style={{ padding: "14px 20px", gap: 12 }}
      >
        <h2
          id="tasting-title"
          className="m-0 font-display text-foreground"
          style={{ fontSize: 24 }}
        >
          Tasting notes{" "}
          <span className="text-muted-foreground" style={{ fontSize: 16 }}>
            {colourInfo(style).label}
          </span>
        </h2>
        <button type="button" onClick={onClose} className="btn-quiet">
          Cancel
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ padding: "18px 20px 28px" }}>
        <div className="mx-auto flex flex-col" style={{ maxWidth: 720, gap: 22 }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Find a note"
            aria-label="Find a note"
            className="field"
          />
          {groups.map((g) => (
            <section key={g.label} className="flex flex-col" style={{ gap: 9 }}>
              <h3 className="caps m-0 text-eyebrow" style={{ fontSize: 10 }}>
                {g.label}
              </h3>
              <div className="flex flex-wrap" style={{ gap: 8 }}>
                {g.notes.map((note) => {
                  const on = picked.includes(note);
                  return (
                    <button
                      key={note}
                      type="button"
                      className="chip"
                      style={{ minHeight: 44 }}
                      data-on={on}
                      aria-pressed={on}
                      disabled={!on && full}
                      onClick={() => toggle(note)}
                    >
                      {note}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {!groups.length ? (
            <p className="m-0 text-muted-foreground" style={{ fontSize: 13 }}>
              No note matches "{filter.trim()}".
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="flex flex-wrap items-center justify-between border-t border-border"
        style={{ padding: "14px 20px", gap: 12 }}
      >
        <span className="text-muted-foreground" style={{ fontSize: 13 }} aria-live="polite">
          {picked.length === 1 ? "1 note chosen" : `${picked.length} notes chosen`}
          {full ? ", the most a bottle can hold" : ""}
        </span>
        <div className="flex" style={{ gap: 10 }}>
          {picked.length ? (
            <button type="button" className="btn-quiet" onClick={() => setPicked([])}>
              Clear all
            </button>
          ) : null}
          <button
            type="button"
            className="btn-gold"
            style={{ background: "rgba(201,169,97,.12)" }}
            onClick={() => onDone(picked)}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
