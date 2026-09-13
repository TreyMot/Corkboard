import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/components/SiteFooter";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility | Corkboard" },
      {
        name: "description",
        content:
          "How Corkboard works toward being usable by everyone, and how to report a problem.",
      },
    ],
  }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  return (
    <LegalPage title="Accessibility" updated="September 12, 2026">
      <p>
        Corkboard should be easy to use for every member, including people who use a keyboard, a
        screen reader, larger text or reduced motion. The target is the Web Content Accessibility
        Guidelines (WCAG) 2.2 at level AA.
      </p>

      <h2>What has been done</h2>
      <ul>
        <li>
          Every main screen was checked with the axe-core automated accessibility tester on
          September 12, 2026, with no issues found.
        </li>
        <li>
          Text and control colours were measured, not judged by eye, so small text and the edges of
          form fields stand out clearly against the dark background.
        </li>
        <li>
          Everything can be reached with the keyboard, with a visible focus outline and a "Skip to
          content" link. Photo screens close with Escape, and photos can be framed with the arrow
          keys.
        </li>
        <li>Form fields are labelled, and tap targets are at least 24 pixels.</li>
        <li>Animations switch off if your device is set to reduce motion.</li>
      </ul>

      <h2>Known limits</h2>
      <p>
        Automated testing does not catch everything, and Corkboard has not yet been tested with
        screen readers such as VoiceOver or NVDA, or by members with disabilities. If something gets
        in your way, that is a bug worth fixing.
      </p>

      <h2>Report a problem</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with what you were trying to
        do and what happened. You will get a reply within a week, and either a fix or another way to
        get it done.
      </p>
    </LegalPage>
  );
}
