import { colourInfo, type Colour } from "@/lib/rim";

/** Wine names are the only text set in Cormorant Garamond italic, never below 18px. */
export function WineName({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`wine-name ${className}`}>{children}</span>;
}

/** Colour mark — always paired with its text label; colour is never the only signal. */
export function ColourMark({ colour }: { colour: Colour }) {
  const info = colourInfo(colour);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-full border border-border"
        style={{ backgroundColor: info.mark }}
      />
      {info.label}
    </span>
  );
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <ul className="space-y-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="animate-pulse rounded-sm bg-card p-5">
          <div className="h-3 w-24 rounded-sm bg-accent" />
          <div className="mt-3 h-5 w-2/3 rounded-sm bg-accent" />
          <div className="mt-2 h-3 w-1/2 rounded-sm bg-accent" />
          <div className="mt-4 h-3 w-full rounded-sm bg-accent" />
        </li>
      ))}
    </ul>
  );
}

export function InlineError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-2 text-sm text-destructive">
      {children}
    </p>
  );
}

/** Where the wine's identity came from. LWIN is CC BY 4.0, so matched wines carry the credit. */
export function IdentityNote({ wine }: { wine: { verified: boolean; lwin7: string | null } }) {
  if (wine.verified && wine.lwin7) {
    return (
      <p className="m-0 text-quiet" style={{ fontSize: 11, lineHeight: 1.6 }}>
        Identified as LWIN {wine.lwin7}. Wine data from{" "}
        <a
          href="https://www.liv-ex.com/lwin/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >
          LWIN by Liv-ex
        </a>
        ,{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >
          CC BY 4.0
        </a>
        ; details may since have been edited by members.
      </p>
    );
  }
  return (
    <p className="m-0 text-quiet" style={{ fontSize: 11, lineHeight: 1.6 }}>
      Not matched to LWIN.
    </p>
  );
}
