import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/components/SiteFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy | Corkboard" },
      {
        name: "description",
        content: "What Corkboard collects, who can see it, and how to delete it.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="September 13, 2026">
      <p>
        Corkboard is a private, invite-only wine journal run by Trey Motsenbocker for a small circle
        of family and friends. This page explains what the journal keeps about you, who can see it,
        and how to have it deleted. Questions go to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>What Corkboard keeps</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your email address, the name you join with, and your
          password. The password is held by our sign-in provider in a scrambled form that nobody can
          read back.
        </li>
        <li>
          <strong>Your journal:</strong> the wines you log, their vintages and bottle sizes, your
          ratings, tasting notes and notes, where you drank them, and when.
        </li>
        <li>
          <strong>Private details:</strong> your optional 100-point scores, how many bottles you
          own, and your wishlist.
        </li>
        <li>
          <strong>Photographs:</strong> your optional profile photo and any bottle photos you add.
          Every photo is resized and re-saved in your browser before it is uploaded, which strips
          the location and camera details phones attach to pictures.
        </li>
        <li>
          <strong>Label photos you ask us to read</strong> (see "Label reading" below).
        </li>
        <li>
          <strong>Housekeeping:</strong> invite codes you create and who used them, corrections you
          make to shared wine details (what changed, when, and by whom), and the date you confirmed
          you are 21 or older.
        </li>
      </ul>
      <p>
        Corkboard does not collect your location, contacts or payment details, and it has no
        analytics, advertising or tracking tools.
      </p>

      <h2>Who can see it</h2>
      <ul>
        <li>
          <strong>Other members</strong> see your name, profile photo, ratings, tasting notes,
          notes, where you drank a wine, dates, the bottles you have logged (including ones not
          opened yet), and the photos on them.
        </li>
        <li>
          <strong>Only you</strong> see your 100-point scores, bottles owned, wishlist and wishlist
          photos.
        </li>
        <li>
          <strong>Wine details</strong> (names, producers, regions, grapes) are shared by the whole
          circle, and any member can correct them.
        </li>
        <li>
          <strong>Nobody outside the circle</strong> can see anything. Every page past the sign-in
          screen requires a member account, and the database itself refuses anyone who is not a
          member.
        </li>
      </ul>

      <h2>Label reading</h2>
      <p>
        When you tap "Photograph the label", that photo is sent to Anthropic, whose Claude AI model
        reads the label and returns details like the producer, wine name and vintage. Anthropic
        handles it under its commercial terms for business customers. The result is only a
        suggestion: you check and edit it before anything is saved. To recognise the wine, Corkboard
        compares those details with LWIN, a public list of wines published by Liv-ex; nothing about
        you is sent to Liv-ex. If you never use the label button, no photo of yours goes to
        Anthropic.
      </p>

      <h2>Services Corkboard relies on</h2>
      <ul>
        <li>
          <strong>Supabase</strong> stores the database, sign-in and photos. Data is kept in the
          United States (its West US, Oregon region).
        </li>
        <li>
          <strong>Anthropic</strong> reads label photos, only when you ask it to.
        </li>
        <li>
          <strong>The web host</strong> delivers the pages and, like any web server, may briefly log
          technical details such as your IP address and browser to keep the site secure and running.
        </li>
        <li>
          <strong>Resend</strong> sends password reset emails to your address, from corkboard.wine.
        </li>
      </ul>
      <p>Your information is never sold, rented or shared for advertising.</p>

      <h2>Cookies and browser storage</h2>
      <p>
        Corkboard sets no advertising or analytics cookies. To keep you signed in, it stores your
        sign-in session in your browser&apos;s local storage; signing out clears it. Fonts are
        served from Corkboard itself, not from a third party.
      </p>

      <h2>How long it is kept, and deleting it</h2>
      <p>
        Your information stays as long as your account does. You can delete your account at any time
        from your profile page: that removes your profile, ratings, notes, private scores, wishlist,
        photos, invite codes and correction history straight away. Wine details you added stay in
        the shared list, because other members may have logged the same wine. Photos you remove from
        a bottle are hidden at once and erased for good when your account is deleted. Our database
        provider may keep backup copies for a short period before they are overwritten.
      </p>

      <h2>Your choices</h2>
      <p>
        You can see and edit everything you have added from inside the journal, and delete your
        account yourself. To get a copy of your data, or for anything else about your information,
        email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>; you will get an answer within
        30 days.
      </p>

      <h2>Age</h2>
      <p>
        Corkboard is for adults 21 and over, and every member confirms their age when they join. If
        we learn that a member is under 21, their account will be deleted.
      </p>

      <h2>Keeping it safe</h2>
      <p>
        Access is limited to members by rules in the database itself, photos are stored privately,
        connections are encrypted, and passwords are handled by the sign-in provider. No system is
        perfect: if something ever goes wrong that affects your information, you will be told
        promptly.
      </p>

      <h2>Changes</h2>
      <p>
        If this page changes, the date at the top changes with it, and members will be told about
        anything significant. See also the <Link to="/terms">terms</Link>.
      </p>
    </LegalPage>
  );
}
