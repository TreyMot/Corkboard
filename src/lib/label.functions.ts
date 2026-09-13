import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as z4 from "zod/v4";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** What the model reads off a label. Null means "not printed", never a guess. */
const LabelRead = z4.object({
  legible: z4.boolean(),
  several_wines: z4.boolean(),
  producer: z4.string().nullable(),
  cuvee: z4.string().nullable(),
  vintage: z4.number().int().nullable(),
  non_vintage: z4.boolean(),
  appellation: z4.string().nullable(),
  country: z4.string().nullable(),
  varietal: z4.string().nullable(),
  style: z4.enum(["red", "white", "rose", "orange", "sparkling", "fortified"]).nullable(),
  volume_ml: z4.number().int().nullable(),
});
export type LabelRead = z4.infer<typeof LabelRead>;

const SYSTEM = `You read wine labels from photographs for a private wine journal.

Report what is printed on the label, in the label's own language and spelling, accents included.
If the label is in a non-Latin script (Cyrillic, Greek, Georgian, Japanese...), transliterate names into the Latin alphabet.
If several different wines are in the photo, read the most prominent one and set several_wines to true.
Leave out quotation marks around names.
- producer: the estate, domaine, chateau, winery or house. Keep words like Domaine or Chateau when printed.
- cuvee: the wine or bottling name, without the producer, vintage, grape or appellation. Null when the label names only the producer and a grape or place.
- vintage: the harvest year as printed. non_vintage is true only when the label says NV or shows no year on a style that is usually non-vintage (Champagne, sherry, tawny port).
- appellation: the appellation or region name with any cru level, such as "Chablis Grand Cru", "Barolo", "Douro" or "Chateauneuf-du-Pape". Leave out boilerplate like "Appellation d'Origine Controlee", "DOC", "DOCG", "AOP" or "Denominacion de Origen".
- country: the country of origin if printed or unambiguous from the appellation.
- varietal: grapes only as printed on the label. Do not infer grapes from the appellation.
- style: red, white, rose, orange, sparkling or fortified, from the label, the bottle and any visible wine.
- volume_ml: the stated volume in millilitres (75 cl is 750).
Use null for anything you cannot read. Set legible to false if the photo shows no readable wine label.`;

const input = z.object({
  // Base64 JPEG, downscaled in the browser to a 1568px long edge (well under 2 MB).
  image: z
    .string()
    .max(4_000_000)
    .regex(/^[A-Za-z0-9+/=]+$/),
});

export type IdentifyResult = { ok: true; read: LabelRead } | { ok: false; error: string };

export const identifyLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data, context }): Promise<IdentifyResult> => {
    // Members only: an auth account without a profile row is not in the circle.
    const { data: profile } = await context.supabase
      .from("profile")
      .select("id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile) return { ok: false, error: "Only members can read labels." };

    if (!process.env["ANTHROPIC_API_KEY"]) {
      console.error("[label] ANTHROPIC_API_KEY is not set");
      return { ok: false, error: "Label reading isn't set up yet. Type the producer instead." };
    }

    // ponytail: no per-member rate limit; fine for an invite-only circle, add one if it opens up.
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const { betaZodOutputFormat } = await import("@anthropic-ai/sdk/helpers/beta/zod");
    // Keys that aren't scoped to one workspace must name it on every request.
    const workspace = process.env["ANTHROPIC_WORKSPACE_ID"];
    const client = new Anthropic(
      workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {},
    );

    try {
      const response = await client.beta.messages.parse({
        model: "claude-opus-5",
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low", format: betaZodOutputFormat(LabelRead) },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: data.image },
              },
              { type: "text", text: "Read this wine label." },
            ],
          },
        ],
      });

      if (response.stop_reason === "refusal" || !response.parsed_output) {
        console.error("[label] no parsed output", response.stop_reason);
        return { ok: false, error: "That label couldn't be read. Type the producer instead." };
      }
      return { ok: true, read: response.parsed_output };
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        return { ok: false, error: "Too many labels at once. Try again in a minute." };
      }
      if (error instanceof Anthropic.APIError) {
        console.error(`[label] API error ${error.status}:`, error.message);
      } else {
        console.error("[label]", error);
      }
      return { ok: false, error: "That label couldn't be read. Type the producer instead." };
    }
  });
