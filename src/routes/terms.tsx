import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/components/SiteFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms | Corkboard" },
      { name: "description", content: "The terms for using Corkboard, a private wine journal." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms" updated="September 12, 2026">
      <p>
        Corkboard is a private, invite-only wine journal run by Trey Motsenbocker for a small circle
        of family and friends. It is free and has no advertising. By joining or using it you agree
        to these terms and to the <Link to="/privacy">privacy policy</Link>.
      </p>

      <h2>Who can join</h2>
      <ul>
        <li>Members join by invitation or by being approved in advance.</li>
        <li>You must be 21 or older.</li>
        <li>
          One person per account. Keep your password to yourself; you are responsible for what
          happens on your account.
        </li>
      </ul>

      <h2>Your content</h2>
      <p>
        Your ratings, notes and photos stay yours. By adding them you let Corkboard store them and
        show them to other members, which is what the journal is for. You can edit or delete them,
        or your whole account, at any time. Only post photos and notes you have the right to share.
      </p>

      <h2>Shared wine details</h2>
      <p>
        Wine names, producers and regions are shared by the whole circle, and any member can correct
        them. Every correction is recorded. Some wine details come from LWIN, published by Liv-ex
        under the Creative Commons Attribution 4.0 licence.
      </p>

      <h2>Using Corkboard well</h2>
      <ul>
        <li>Be respectful of the other members.</li>
        <li>Do not post anything illegal, abusive, or private information about other people.</li>
        <li>
          Do not try to get into accounts or information that are not yours, overload the service,
          or copy it with automated tools.
        </li>
        <li>Do not use Corkboard to sell alcohol or to encourage anyone under 21 to drink.</li>
      </ul>

      <h2>About the wine</h2>
      <p>
        Corkboard is a journal for adults. Ratings and notes are personal opinions, not advice.
        Please drink responsibly, and never drive after drinking. Corkboard does not sell or deliver
        alcohol.
      </p>

      <h2>Label reading</h2>
      <p>
        The label reader uses AI and can get things wrong. Check what it fills in before saving;
        what you save is your responsibility.
      </p>

      <h2>A small, private project</h2>
      <p>
        Corkboard is provided as it is, without guarantees that it will always be available or free
        of mistakes, and features may change. It might be paused or closed; if that happens, members
        will be given notice and a way to get their data where possible. Keep your own copy of
        anything you cannot afford to lose.
      </p>
      <p>
        To the extent the law allows, Corkboard and the person who runs it are not liable for
        indirect losses, or for losses caused by the service being unavailable or by content being
        lost.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can delete your account whenever you like from your profile page. An account that breaks
        these terms may be suspended or removed.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If these terms change, the date at the top changes too, and members will be told about
        anything significant; using Corkboard after that means you accept the new terms. Questions
        go to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
