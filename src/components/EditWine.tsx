import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { InlineError } from "@/components/WineBits";
import { COLOURS, GLASS, glassOf, updateWine, type Colour, type Glass, type Wine } from "@/lib/rim";
import { VARIETALS, normalizeVarietal } from "@/lib/varietal";

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="caps block"
      style={{ letterSpacing: "0.18em", marginBottom: 7 }}
    >
      {children}
    </label>
  );
}

/** Style chips (red, white...) and colour-in-glass chips, shared by edit and log. */
export function StyleAndGlass({
  colour,
  glass,
  onColour,
  onGlass,
}: {
  colour: Colour;
  glass: Glass;
  onColour: (c: Colour) => void;
  onGlass: (g: Glass) => void;
}) {
  return (
    <>
      <div>
        <FieldLabel>Style</FieldLabel>
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {COLOURS.map((c) => (
            <button
              key={c.value}
              type="button"
              className="chip"
              style={{ minHeight: 44 }}
              data-on={colour === c.value}
              aria-pressed={colour === c.value}
              onClick={() => onColour(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Color in glass</FieldLabel>
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {GLASS.map((g) => (
            <button
              key={g.value}
              type="button"
              className="chip"
              style={{ minHeight: 44 }}
              data-on={glass === g.value}
              aria-pressed={glass === g.value}
              onClick={() => onGlass(g.value)}
            >
              <span aria-hidden style={{ width: 16, height: 3, background: g.hex }} />
              {g.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export function VarietalSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      id={id}
      value={normalizeVarietal(value) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="field"
    >
      <option value="">None, it's a place, not a grape</option>
      {VARIETALS.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}

/** Corrections apply everywhere the wine appears, and are logged to wine_edit_log. */
export function EditWine({
  wine,
  userId,
  onDone,
}: {
  wine: Wine;
  userId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    producer: wine.producer,
    cuvee: wine.cuvee ?? "",
    vineyard: wine.vineyard ?? "",
    region: wine.region ?? "",
    location: wine.location ?? "",
    country: wine.country ?? "",
    varietal: wine.varietal ?? "",
  });
  const [colour, setColour] = useState<Colour>(wine.colour);
  const [glass, setGlass] = useState<Glass>(glassOf(wine).value);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const text = (key: keyof typeof f, label: string, placeholder: string, wide = false) => (
    <div style={{ gridColumn: wide ? "1 / -1" : "auto" }}>
      <FieldLabel htmlFor={`edit-${key}`}>{label}</FieldLabel>
      <input
        id={`edit-${key}`}
        className="field"
        value={f[key]}
        placeholder={placeholder}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
      />
    </div>
  );
  const orNull = (v: string) => v.trim() || null;

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (!f.producer.trim()) {
          setError("A producer is the one thing a wine can't be without.");
          return;
        }
        setBusy(true);
        try {
          await updateWine(userId, wine, {
            producer: f.producer.trim(),
            cuvee: orNull(f.cuvee),
            vineyard: orNull(f.vineyard),
            region: orNull(f.region),
            location: orNull(f.location),
            country: orNull(f.country),
            varietal: orNull(f.varietal),
            colour,
            glass,
          });
          await queryClient.invalidateQueries();
          onDone();
        } catch {
          setError("Couldn't save those corrections.");
        } finally {
          setBusy(false);
        }
      }}
      className="flex flex-col border-t border-border"
      style={{ gap: 20, marginTop: 18, paddingTop: 20 }}
    >
      <p className="m-0 text-quiet" style={{ fontSize: 11, lineHeight: 1.6 }}>
        Corrections apply everywhere the bottle appears, including the grid tile and the label
        plate.
      </p>
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "16px 20px" }}
      >
        {text("cuvee", "Wine name", "Les Clos", true)}
        {text("producer", "Producer", "Vincent Dauvissat")}
        {text("vineyard", "Vineyard", "Les Clos")}
        {text("region", "Region or appellation", "Chablis")}
        {text("country", "Country", "France")}
        {text("location", "Location", "Chablis, Burgundy", true)}
        <div style={{ gridColumn: "1 / -1" }}>
          <FieldLabel htmlFor="edit-varietal">Varietal</FieldLabel>
          <VarietalSelect
            id="edit-varietal"
            value={f.varietal}
            onChange={(v) => setF({ ...f, varietal: v })}
          />
        </div>
      </div>
      <StyleAndGlass colour={colour} glass={glass} onColour={setColour} onGlass={setGlass} />
      {error ? <InlineError>{error}</InlineError> : null}
      <div className="flex flex-wrap" style={{ gap: 12 }}>
        <button
          type="submit"
          disabled={busy}
          className="btn-gold"
          style={{ background: "rgba(201,169,97,.12)" }}
        >
          {busy ? "Saving" : "Save changes"}
        </button>
        <button type="button" onClick={onDone} className="btn-quiet">
          Cancel
        </button>
      </div>
    </form>
  );
}
