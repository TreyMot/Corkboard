import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell, BackToGrid } from "@/components/AppShell";
import { FieldLabel as Label, StyleAndGlass, VarietalSelect } from "@/components/EditWine";
import { StarPicker } from "@/components/Stars";
import { ColourMark, InlineError, SkeletonRows, WineName } from "@/components/WineBits";
import { wineTitle } from "@/components/WineTile";
import { identifyLabel } from "@/lib/label.functions";
import { centreCrop, DecodeError, decodeFile, labelImageBase64, uploadPhoto } from "@/lib/photos";
import {
  addToWishlist,
  adoptLwinWine,
  confidentMatch,
  glassForStyle,
  isOnWishlist,
  matchLabel,
  buildRanges,
  buildVintageOptions,
  createWine,
  ensureBottling,
  getMyRatingFor,
  getMyRecentWines,
  getWine,
  getWineBottlings,
  getWinesByProducer,
  removeWishlistItem,
  saveRating,
  searchProducers,
  todayLocal,
  type Colour,
  type Glass,
  type Wine,
} from "@/lib/rim";
import { detectVarietal, normalizeVarietal } from "@/lib/varietal";

export const Route = createFileRoute("/_authenticated/add")({
  head: () => ({
    meta: [
      { title: "Log a bottle | Corkboard" },
      { name: "description", content: "Find a wine by brand, range and bottling, then rate it." },
      { property: "og:title", content: "Log a bottle | Corkboard" },
      {
        property: "og:description",
        content: "Type the brand, tap the rest, pick a vintage, rate it.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => {
    const wine = typeof search["wine"] === "string" ? search["wine"] : undefined;
    const wishlist = typeof search["wishlist"] === "string" ? search["wishlist"] : undefined;
    return { ...(wine ? { wine } : {}), ...(wishlist ? { wishlist } : {}) } as {
      wine?: string;
      wishlist?: string;
    };
  },
  component: AddPage,
});

const FORMATS = [
  { ml: 375, label: "Half · 375ml" },
  { ml: 750, label: "Bottle · 750ml" },
  { ml: 1500, label: "Magnum · 1.5L" },
];

function AddPage() {
  const { user } = Route.useRouteContext();
  const params = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- drill-down state -----------------------------------------------------
  const [term, setTerm] = useState("");
  const [producer, setProducer] = useState<string | null>(null);
  const [rangeKey, setRangeKey] = useState<string | null>(null);
  const [wine, setWine] = useState<Wine | null>(null);
  const [vintage, setVintage] = useState<number | null>(null);
  const [vintageChosen, setVintageChosen] = useState(false);
  const [autoSkipped, setAutoSkipped] = useState<{ range?: string; wine?: string }>({});

  // --- manual entry ---------------------------------------------------------
  const [manual, setManual] = useState(false);
  const [mProducer, setMProducer] = useState("");
  const [mCuvee, setMCuvee] = useState("");
  const [mRegion, setMRegion] = useState("");
  const [mVarietal, setMVarietal] = useState("");
  const [mVineyard, setMVineyard] = useState("");
  const [mLocation, setMLocation] = useState("");
  const [mCountry, setMCountry] = useState("");
  const [colour, setColour] = useState<Colour>("red");
  const [glass, setGlass] = useState<Glass>("garnet");

  // --- rating ---------------------------------------------------------------
  const [formatMl, setFormatMl] = useState(750);
  const [stars, setStars] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [place, setPlace] = useState("");
  const [wishOnly, setWishOnly] = useState(false);
  const [score, setScore] = useState("");
  const [drunkOn, setDrunkOn] = useState(todayLocal);

  const [starError, setStarError] = useState(false);
  const [wineError, setWineError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // --- label photo ----------------------------------------------------------
  const readLabelFn = useServerFn(identifyLabel);
  const [labelBusy, setLabelBusy] = useState(false);
  const [labelNote, setLabelNote] = useState<string | null>(null);
  const [labelShot, setLabelShot] = useState<ImageBitmap | null>(null);
  const [readVintage, setReadVintage] = useState<number | null>(null);
  // Set when the form was filled from an LWIN record; kept only if producer and name stay as read.
  const [lwinPick, setLwinPick] = useState<{
    lwin7: string;
    producer: string;
    cuvee: string;
  } | null>(null);

  // Prefill from "log this" / wishlist links.
  const prefillId = params.wine;
  useEffect(() => {
    if (!prefillId) return;
    getWine(prefillId).then((w) => {
      if (!w) return;
      setWine(w);
      setProducer(w.producer);
      setTerm(w.producer);
    });
  }, [prefillId]);

  const recent = useQuery({
    queryKey: ["my-recent-wines", user.id],
    queryFn: () => getMyRecentWines(user.id),
    enabled: !producer && !manual && term.trim().length === 0,
  });

  const brands = useQuery({
    queryKey: ["producer-search", term.trim()],
    queryFn: () => searchProducers(term),
    enabled: !producer && !manual && term.trim().length > 1,
  });

  const producerWines = useQuery({
    queryKey: ["producer-wines", producer],
    queryFn: () => getWinesByProducer(producer!),
    enabled: !!producer && !manual,
  });

  const ranges = useMemo(() => buildRanges(producerWines.data ?? []), [producerWines.data]);
  const range = ranges.find((r) => r.key === rangeKey) ?? null;

  // Auto-skip steps with exactly one option.
  useEffect(() => {
    if (!producer || manual || wine) return;
    if (!ranges.length) return;
    if (!rangeKey && ranges.length === 1) {
      const only = ranges[0]!;
      setRangeKey(only.key);
      setAutoSkipped((s) => ({ ...s, range: only.label }));
    }
  }, [producer, manual, wine, ranges, rangeKey]);

  useEffect(() => {
    if (!range || wine || manual) return;
    if (range.wines.length === 1) {
      const only = range.wines[0]!;
      setWine(only);
      setAutoSkipped((s) => ({ ...s, wine: only.cuvee }));
    }
  }, [range, wine, manual]);

  const bottlings = useQuery({
    queryKey: ["wine-bottlings", wine?.id],
    queryFn: () => getWineBottlings(wine!.id),
    enabled: !!wine,
  });

  const vintageOptions = useMemo(() => {
    const options = buildVintageOptions(bottlings.data ?? []);
    // A label read can name a year older than the generated list.
    if (readVintage != null && !options.some((o) => o.value === readVintage)) {
      options.splice(options.length - 1, 0, {
        value: readVintage,
        label: String(readVintage),
        logged: false,
      });
    }
    return options;
  }, [bottlings.data, readVintage]);

  async function readLabel(file: File) {
    setLabelNote(null);
    setLabelBusy(true);
    try {
      const bitmap = await decodeFile(file);
      setLabelShot(bitmap);
      const result = await readLabelFn({ data: { image: await labelImageBase64(bitmap) } });
      if (!result.ok) {
        setLabelNote(result.error);
        return;
      }
      const read = result.read;
      if (!read.legible || !(read.producer || read.cuvee)) {
        setLabelNote(
          "No label could be read in that photo. Try again closer, or type the producer.",
        );
        return;
      }
      const several = read.several_wines
        ? "Several bottles in the photo; this is the most prominent. "
        : "";

      if (read.non_vintage) {
        setVintage(null);
        setVintageChosen(true);
      } else if (read.vintage) {
        setReadVintage(read.vintage);
        setVintage(read.vintage);
        setVintageChosen(true);
      }
      if (read.volume_ml && FORMATS.some((f) => f.ml === read.volume_ml))
        setFormatMl(read.volume_ml);
      const style: Colour = read.style ?? "red";

      // LWIN may name the wine by its cuvee, cuvee and grape, the grape, or the appellation.
      const both = (a: string | null, b: string | null) => (a && b ? `${a} ${b}` : null);
      const names = (
        read.cuvee
          ? [read.cuvee, both(read.cuvee, read.varietal), read.appellation]
          : [read.varietal, read.appellation, both(read.appellation, read.varietal)]
      ).filter((n): n is string => !!n);
      const match = read.producer
        ? confidentMatch(await matchLabel(read.producer, names, read.style, !!read.cuvee))
        : null;
      if (match?.source === "cellar" && match.wine_id) {
        const w = await getWine(match.wine_id);
        if (w) {
          setManual(false);
          setWine(w);
          setProducer(w.producer);
          setLabelNote(
            `${several}This looks like a wine the circle has logged before. Check it before saving.`,
          );
          return;
        }
      }

      setLwinPick(
        match?.source === "lwin" && match.lwin7
          ? { lwin7: match.lwin7, producer: match.producer, cuvee: match.cuvee ?? "" }
          : null,
      );
      setWine(null);
      setManual(true);
      setMProducer(match?.source === "lwin" ? match.producer : (read.producer ?? ""));
      setMCuvee(match?.source === "lwin" ? (match.cuvee ?? "") : (read.cuvee ?? ""));
      setMRegion((match?.source === "lwin" ? match.region : null) ?? read.appellation ?? "");
      setMCountry((match?.source === "lwin" ? match.country : null) ?? read.country ?? "");
      setMVarietal(read.varietal ?? "");
      setMVineyard("");
      setMLocation("");
      setColour(style);
      setGlass(glassForStyle(style));
      setLabelNote(
        match?.source === "lwin"
          ? `${several}Matched to LWIN ${match.lwin7}. Check the fields before saving.`
          : `${several}Read from the label and not matched to LWIN. Check the fields before saving.`,
      );
    } catch (error) {
      setLabelNote(
        error instanceof DecodeError
          ? error.message
          : "That label couldn't be read. Type the producer instead.",
      );
    } finally {
      setLabelBusy(false);
    }
  }

  /** Attach the label photo to the saved entry. A failed upload never undoes the save. */
  async function attachShot(type: "rating" | "wishlist", entryId: string) {
    if (!labelShot) return;
    try {
      await uploadPhoto({
        type,
        entryId,
        ownerId: user.id,
        bitmap: labelShot,
        crop: centreCrop(labelShot),
        kind: "front",
        makePrimary: true,
      });
    } catch {
      toast("Saved, but the photo didn't upload. Add it from the bottle page.");
    }
  }

  function resetToBrand() {
    setLwinPick(null);
    setLabelNote(null);
    setProducer(null);
    setRangeKey(null);
    setWine(null);
    setVintageChosen(false);
    setAutoSkipped({});
    setManual(false);
  }

  function resetToRange() {
    setRangeKey(null);
    setWine(null);
    setVintageChosen(false);
    setAutoSkipped({});
  }

  function resetToBottling() {
    setWine(null);
    setVintageChosen(false);
    setAutoSkipped((s) => (s.range ? { range: s.range } : {}));
  }

  function chooseWine(w: Wine) {
    setWine(w);
    setProducer(w.producer);
    setVintageChosen(false);
  }

  function startManual(prefill: {
    producer?: string;
    cuvee?: string;
    region?: string;
    varietal?: string;
  }) {
    setManual(true);
    setMProducer(prefill.producer ?? producer ?? term.trim());
    setMCuvee(prefill.cuvee ?? "");
    setMRegion(prefill.region ?? (range?.source === "region" ? range.label : ""));
    setMVarietal(prefill.varietal ?? (range?.source === "varietal" ? range.label : ""));
  }

  const chosenWineLabel = wine ? wine.cuvee : null;
  const readyForVintage = manual ? !!mProducer.trim() : !!wine;

  // --- save -----------------------------------------------------------------
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaveError(null);
    setWineError(null);
    setStarError(false);

    if (manual ? !mProducer.trim() : !wine) {
      setWineError("Pick a wine, or add one by hand.");
      return;
    }
    if (wishOnly) {
      setBusy(true);
      try {
        const chosen = wine ?? (await createManualWine());
        await addToWishlist(user.id, chosen.id);
        const wishId = await isOnWishlist(user.id, chosen.id);
        if (wishId) await attachShot("wishlist", wishId);
        await queryClient.invalidateQueries();
        toast("On the wishlist.");
        navigate({ to: "/feed" });
      } catch {
        setBusy(false);
        setSaveError("That didn't go through. Try again?");
      }
      return;
    }
    if (!vintageChosen) {
      setSaveError("Choose a vintage. Pick Non-vintage if it doesn't have one.");
      return;
    }
    if (stars == null) {
      setStarError(true);
      return;
    }

    setBusy(true);
    try {
      const chosen = wine ?? (await createManualWine());
      const bottling = await ensureBottling(chosen.id, vintage, formatMl);
      const existing = await getMyRatingFor(user.id, bottling.id);
      if (existing) {
        setBusy(false);
        toast("You've already rated this bottling.", {
          action: {
            label: "Edit it",
            onClick: () => {
              void saveExisting(existing.id, bottling.id);
            },
          },
        });
        setSaveError(
          "You've already rated this vintage and format. Use the toast to update it instead.",
        );
        return;
      }

      const ratingId = await saveRating({
        userId: user.id,
        bottlingId: bottling.id,
        stars,
        note: note.trim() || null,
        place: place.trim() || null,
        score100: score.trim() ? Number(score) : null,
        drunkOn,
      });
      if (params.wishlist) await removeWishlistItem(params.wishlist);
      await attachShot("rating", ratingId);
      await queryClient.invalidateQueries();
      toast("Logged.");
      navigate({
        to: "/entry/$entryType/$entryId",
        params: { entryType: "rating", entryId: ratingId },
      });
    } catch {
      setBusy(false);
      toast("That didn't go through. Try again?", {
        action: { label: "Retry", onClick: () => void submit(event) },
      });
      setSaveError("Save failed. Your note is still here.");
    }
  }

  function createManualWine() {
    const normalized =
      normalizeVarietal(mVarietal) ?? detectVarietal(mVarietal) ?? detectVarietal(mCuvee);
    // Filled from LWIN and the identity left as matched: adopt the verified record.
    if (lwinPick && mProducer.trim() === lwinPick.producer && mCuvee.trim() === lwinPick.cuvee) {
      return adoptLwinWine({
        lwin7: lwinPick.lwin7,
        colour,
        varietal: normalized,
        glass,
        vineyard: mVineyard.trim() || null,
        location: mLocation.trim() || null,
      });
    }
    return createWine({
      producer: mProducer.trim(),
      cuvee: mCuvee.trim() || null,
      region: mRegion.trim() || null,
      colour,
      glass,
      varietal: normalized,
      varietal_raw: mVarietal.trim() && mVarietal.trim() !== normalized ? mVarietal.trim() : null,
      vineyard: mVineyard.trim() || null,
      location: mLocation.trim() || null,
      country: mCountry.trim() || null,
    });
  }

  async function saveExisting(ratingId: string, bottlingId: string) {
    try {
      await saveRating({
        id: ratingId,
        userId: user.id,
        bottlingId,
        stars: stars ?? 0,
        note: note.trim() || null,
        place: place.trim() || null,
        score100: score.trim() ? Number(score) : null,
        drunkOn,
      });
      await queryClient.invalidateQueries();
      toast("Logged.");
      navigate({
        to: "/entry/$entryType/$entryId",
        params: { entryType: "rating", entryId: ratingId },
      });
    } catch {
      toast("That didn't go through. Try again?");
    }
  }

  return (
    <AppShell>
      <div style={{ paddingTop: 20 }}>
        <BackToGrid />
      </div>
      <h1
        className="font-display text-foreground"
        style={{ fontWeight: 400, fontSize: 44, lineHeight: 1.04, margin: "20px 0 6px" }}
      >
        Log a bottle
      </h1>
      <p
        className="m-0 text-muted-foreground"
        style={{ fontSize: 13, lineHeight: 1.65, maxWidth: "48ch", marginBottom: 28 }}
      >
        Type the producer, then tap through the range and bottling. What you enter here is what the
        grid shows. Without a photograph the bottle takes a label plate.
      </p>

      <form onSubmit={submit} className="flex flex-col" style={{ maxWidth: 620, gap: 26 }}>
        <section>
          <Crumbs
            items={
              [
                producer ? { label: producer, onClick: resetToBrand } : null,
                range
                  ? {
                      label: range.label,
                      onClick: resetToRange,
                      auto: autoSkipped.range === range.label,
                    }
                  : null,
                chosenWineLabel && chosenWineLabel !== range?.label
                  ? {
                      label: chosenWineLabel,
                      onClick: resetToBottling,
                      auto: autoSkipped.wine === chosenWineLabel,
                    }
                  : null,
                manual
                  ? {
                      label: labelNote ? "Read from the label" : "Added by hand",
                      onClick: () => setManual(false),
                    }
                  : null,
              ].filter(Boolean) as CrumbItem[]
            }
          />

          {labelNote && (manual || wine) ? (
            <p
              role="status"
              className="m-0 mb-4 text-gold"
              style={{ fontSize: 12, lineHeight: 1.6 }}
            >
              {labelNote}
            </p>
          ) : null}

          {manual ? (
            <ManualForm
              producer={mProducer}
              cuvee={mCuvee}
              region={mRegion}
              varietal={mVarietal}
              vineyard={mVineyard}
              location={mLocation}
              country={mCountry}
              colour={colour}
              glass={glass}
              onProducer={setMProducer}
              onCuvee={setMCuvee}
              onRegion={setMRegion}
              onVarietal={setMVarietal}
              onVineyard={setMVineyard}
              onLocation={setMLocation}
              onCountry={setMCountry}
              onColour={setColour}
              onGlass={setGlass}
              onBack={() => {
                setManual(false);
                setLwinPick(null);
                setLabelNote(null);
              }}
            />
          ) : wine ? (
            <div className="border border-border bg-card p-4" style={{ borderRadius: 3 }}>
              <WineName>{wineTitle(wine)}</WineName>
              <p className="mt-1 text-sm text-muted-foreground">
                {[
                  wine.cuvee ? wine.producer : null,
                  wine.varietal_raw ?? wine.varietal,
                  wine.region,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-2">
                <ColourMark colour={wine.colour} />
              </div>
              <button
                type="button"
                onClick={resetToBrand}
                className="tap mt-2 text-sm text-muted-foreground underline underline-offset-4"
              >
                Change wine
              </button>
            </div>
          ) : !producer ? (
            <div>
              <div className="flex flex-wrap items-center" style={{ gap: 12, marginBottom: 22 }}>
                <label
                  className="btn-gold"
                  style={{ background: "rgba(201,169,97,.12)" }}
                  aria-busy={labelBusy}
                >
                  {labelBusy ? "Reading the label" : "Photograph the label"}
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    capture="environment"
                    className="sr-only"
                    disabled={labelBusy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void readLabel(file);
                    }}
                  />
                </label>
                <span
                  className="text-quiet"
                  style={{ fontSize: 11, lineHeight: 1.6, maxWidth: "36ch" }}
                >
                  {labelNote ??
                    "Anthropic's Claude AI reads the photo and fills in the producer, name and vintage for you to check. Or type below."}
                </span>
              </div>
              <Label htmlFor="brand">Brand</Label>
              <input
                id="brand"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Producer or winery"
                autoComplete="off"
                className="w-full border-0 border-b bg-transparent font-display text-foreground outline-none transition-colors duration-[140ms] ease-out placeholder:text-quiet hover:border-[rgba(201,169,97,.5)] focus:border-gold"
                style={{
                  minHeight: 44,
                  borderColor: "var(--color-input)",
                  padding: "11px 2px",
                  fontSize: 19,
                }}
                autoFocus
              />
              {term.trim().length === 0 ? (
                recent.isLoading ? (
                  <div className="mt-3">
                    <SkeletonRows count={3} />
                  </div>
                ) : recent.data?.length ? (
                  <>
                    <p className="caps mt-5 mb-2">Recently poured</p>
                    <RowList>
                      {recent.data.map((w) => (
                        <Row key={w.id} onClick={() => chooseWine(w)}>
                          <WineName>{w.cuvee}</WineName>
                          <span className="mt-0.5 block text-sm text-muted-foreground">
                            {[w.producer, w.region].filter(Boolean).join(" · ")}
                          </span>
                        </Row>
                      ))}
                    </RowList>
                  </>
                ) : null
              ) : brands.isLoading ? (
                <div className="mt-3">
                  <SkeletonRows count={3} />
                </div>
              ) : (
                <div className="mt-3">
                  <RowList>
                    {(brands.data ?? []).map((b) => (
                      <Row
                        key={b.producer}
                        onClick={() => {
                          setProducer(b.producer);
                          setRangeKey(null);
                          setAutoSkipped({});
                        }}
                      >
                        <span className="block text-base">{b.producer}</span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                          {b.wine_count} {b.wine_count === 1 ? "wine" : "wines"}
                        </span>
                      </Row>
                    ))}
                    {term.trim().length > 1 ? (
                      <Row onClick={() => startManual({ producer: term.trim() })}>
                        <span className="block text-sm text-muted-foreground">
                          {brands.data?.length
                            ? "Not here? Add it by hand"
                            : "No match. Add it by hand"}
                        </span>
                      </Row>
                    ) : null}
                  </RowList>
                </div>
              )}
              {wineError ? <InlineError>{wineError}</InlineError> : null}
            </div>
          ) : !range ? (
            <StepList
              title="Range"
              loading={producerWines.isLoading}
              empty={!ranges.length}
              onManual={() => startManual({ producer })}
            >
              {ranges.map((r) => (
                <Row key={r.key} onClick={() => setRangeKey(r.key)}>
                  <span className="block text-base">{r.label}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {r.source === "region"
                      ? "Region"
                      : r.source === "varietal"
                        ? "Varietal"
                        : "Unclassified"}{" "}
                    · {r.wines.length} {r.wines.length === 1 ? "wine" : "wines"}
                  </span>
                </Row>
              ))}
            </StepList>
          ) : (
            <StepList
              title="Bottling"
              loading={producerWines.isLoading}
              empty={!range.wines.length}
              onManual={() =>
                startManual({
                  producer: producer ?? "",
                  region: range.source === "region" ? range.label : "",
                  varietal: range.source === "varietal" ? range.label : "",
                })
              }
            >
              {range.wines.map((w) => (
                <Row key={w.id} onClick={() => chooseWine(w)}>
                  <WineName>{w.cuvee}</WineName>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {[w.varietal_raw ?? w.varietal, w.region].filter(Boolean).join(" · ") ||
                      "No region on file"}
                  </span>
                </Row>
              ))}
            </StepList>
          )}
        </section>

        {readyForVintage ? (
          <button
            type="button"
            onClick={() => setWishOnly((v) => !v)}
            aria-pressed={wishOnly}
            className="flex cursor-pointer items-center self-start border-0 bg-transparent"
            style={{ gap: 9, padding: "10px 2px", minHeight: 44, fontSize: 12, color: "#b9ae9d" }}
          >
            <span
              aria-hidden
              className="relative transition-colors duration-[110ms] ease-out"
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                border: `1px solid ${wishOnly ? "var(--color-gold)" : "var(--color-input)"}`,
                background: wishOnly ? "var(--color-gold)" : "transparent",
              }}
            >
              <span
                className="absolute"
                style={{
                  left: 3,
                  top: 1,
                  width: 5,
                  height: 8,
                  borderRight: "1.5px solid var(--color-background)",
                  borderBottom: "1.5px solid var(--color-background)",
                  transform: "rotate(40deg)",
                  opacity: wishOnly ? 1 : 0,
                }}
              />
            </span>
            Not tasted yet, put it on the wishlist
          </button>
        ) : null}

        {readyForVintage && !wishOnly ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="vintage">Vintage</Label>
                {bottlings.isLoading && wine ? (
                  <SkeletonRows count={1} />
                ) : (
                  <select
                    id="vintage"
                    value={vintageChosen ? (vintage == null ? "nv" : String(vintage)) : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) {
                        setVintageChosen(false);
                        return;
                      }
                      setVintage(v === "nv" ? null : Number(v));
                      setVintageChosen(true);
                    }}
                    className="field"
                  >
                    <option value="">Choose a vintage</option>
                    {vintageOptions.some((o) => o.logged) ? (
                      <optgroup label="Already logged here">
                        {vintageOptions
                          .filter((o) => o.logged)
                          .map((o) => (
                            <option
                              key={`l-${o.label}`}
                              value={o.value == null ? "nv" : String(o.value)}
                            >
                              {o.label}
                            </option>
                          ))}
                      </optgroup>
                    ) : null}
                    <optgroup label="Other years">
                      {vintageOptions
                        .filter((o) => !o.logged && o.value != null)
                        .map((o) => (
                          <option key={o.label} value={String(o.value)}>
                            {o.label}
                          </option>
                        ))}
                    </optgroup>
                    {vintageOptions.some((o) => o.value == null && !o.logged) ? (
                      <option value="nv">Non-vintage</option>
                    ) : null}
                  </select>
                )}
              </div>
              <div>
                <Label htmlFor="drunk_on">Drank on</Label>
                <input
                  id="drunk_on"
                  type="date"
                  value={drunkOn}
                  onChange={(e) => setDrunkOn(e.target.value)}
                  className="field"
                />
              </div>
            </section>

            <section>
              <Label>Format</Label>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.ml}
                    type="button"
                    onClick={() => setFormatMl(f.ml)}
                    className="chip"
                    style={{ minHeight: 44 }}
                    data-on={formatMl === f.ml}
                    aria-pressed={formatMl === f.ml}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="border-t border-border" style={{ paddingTop: 20 }}>
              <Label>Your rating</Label>
              <StarPicker value={stars} onChange={setStars} invalid={starError} />
              {starError ? <InlineError>Give it a star rating before saving.</InlineError> : null}
            </section>

            <section>
              <Label htmlFor="place">Where you drank it</Label>
              <input
                id="place"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                maxLength={200}
                placeholder="At the Kesslers, in the garden"
                className="field"
              />
            </section>

            <section>
              <Label htmlFor="note">Note</Label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                maxLength={2000}
                className="field"
                style={{ resize: "vertical", lineHeight: 1.6 }}
              />
            </section>

            <section>
              <Label htmlFor="score">Your 100-point score (private, optional)</Label>
              <input
                id="score"
                inputMode="numeric"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="field"
                style={{ width: 128 }}
              />
            </section>
          </>
        ) : null}

        {readyForVintage ? (
          <div className="flex flex-wrap items-center" style={{ gap: 12, paddingTop: 6 }}>
            <button
              type="submit"
              disabled={busy}
              className="btn-gold"
              style={{ fontSize: 11, padding: "0 20px", background: "rgba(201,169,97,.12)" }}
            >
              {busy ? "Saving" : wishOnly ? "Add to wishlist" : "Save to cellar"}
            </button>
            <Link to="/feed" className="btn-quiet" style={{ fontSize: 11, padding: "0 18px" }}>
              Cancel
            </Link>
            <span className="text-quiet" style={{ fontSize: 11 }}>
              {wishOnly
                ? "Kept out of the cellar until a bottle lands."
                : "Opens the bottle page once saved."}
            </span>
          </div>
        ) : null}
        {saveError ? <InlineError>{saveError}</InlineError> : null}
      </form>
    </AppShell>
  );
}

type CrumbItem = { label: string; onClick: () => void; auto?: boolean };

function Crumbs({ items }: { items: CrumbItem[] }) {
  if (!items.length) return null;
  return (
    <nav
      aria-label="Steps"
      className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1"
      style={{ fontSize: 13 }}
    >
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-2">
          {i > 0 ? <span className="text-quiet">›</span> : null}
          <button
            type="button"
            onClick={item.onClick}
            className="tap text-gold underline decoration-[rgba(201,169,97,.4)] underline-offset-4"
          >
            {item.label}
          </button>
          {item.auto ? <span className="text-xs text-muted-foreground">(only option)</span> : null}
        </span>
      ))}
    </nav>
  );
}

function RowList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="overflow-hidden border border-border" style={{ borderRadius: 3 }}>
      {children}
    </ul>
  );
}

function Row({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <li className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={onClick}
        className="tap w-full cursor-pointer bg-card px-4 py-3 text-left transition-colors duration-[120ms] ease-out hover:bg-[rgba(201,169,97,.06)]"
      >
        {children}
      </button>
    </li>
  );
}

function StepList({
  title,
  loading,
  empty,
  onManual,
  children,
}: {
  title: string;
  loading: boolean;
  empty: boolean;
  onManual: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{title}</Label>
      {loading ? (
        <SkeletonRows count={3} />
      ) : (
        <RowList>
          {children}
          <Row onClick={onManual}>
            <span className="block text-sm text-muted-foreground">
              {empty ? "No match. Add it by hand" : "Not here? Add it by hand"}
            </span>
          </Row>
        </RowList>
      )}
    </div>
  );
}

function ManualForm(props: {
  producer: string;
  cuvee: string;
  region: string;
  varietal: string;
  vineyard: string;
  location: string;
  country: string;
  colour: Colour;
  glass: Glass;
  onProducer: (v: string) => void;
  onCuvee: (v: string) => void;
  onRegion: (v: string) => void;
  onVarietal: (v: string) => void;
  onVineyard: (v: string) => void;
  onLocation: (v: string) => void;
  onCountry: (v: string) => void;
  onColour: (v: Colour) => void;
  onGlass: (v: Glass) => void;
  onBack: () => void;
}) {
  const text = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    placeholder: string,
    wide = false,
  ) => (
    <div style={{ gridColumn: wide ? "1 / -1" : "auto" }}>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        className="field"
        autoFocus={id === "cuvee"}
      />
    </div>
  );
  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "16px 20px" }}
      >
        {text("cuvee", "Wine name", props.cuvee, props.onCuvee, "Les Clos", true)}
        {text("producer", "Producer", props.producer, props.onProducer, "Vincent Dauvissat")}
        {text("vineyard", "Vineyard (optional)", props.vineyard, props.onVineyard, "Les Clos")}
        {text(
          "region",
          "Region or appellation (optional)",
          props.region,
          props.onRegion,
          "Chablis",
        )}
        {text("country", "Country (optional)", props.country, props.onCountry, "France")}
        {text(
          "location",
          "Location (optional)",
          props.location,
          props.onLocation,
          "Chablis, Burgundy",
          true,
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          <Label htmlFor="varietal">Varietal (optional)</Label>
          <VarietalSelect id="varietal" value={props.varietal} onChange={props.onVarietal} />
        </div>
      </div>
      <StyleAndGlass
        colour={props.colour}
        glass={props.glass}
        onColour={props.onColour}
        onGlass={props.onGlass}
      />
      <button
        type="button"
        onClick={props.onBack}
        className="tap self-start text-sm text-muted-foreground underline underline-offset-4"
      >
        Back to search
      </button>
    </div>
  );
}
