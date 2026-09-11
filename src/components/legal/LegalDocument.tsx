import Link from "next/link";

type TocEntry = {
  id: string;
  title: string;
};

type LegalDocumentProps = {
  title: string;
  effectiveDate: string;
  summary: string;
  sections: readonly TocEntry[];
  children: React.ReactNode;
};

/**
 * Shared shell for /legal/terms and /legal/privacy: title + dates + a jump-link
 * table of contents generated from the same `sections` list each page passes
 * to its <LegalSection> blocks, so the two never drift out of sync.
 */
export function LegalDocument({
  title,
  effectiveDate,
  summary,
  sections,
  children,
}: LegalDocumentProps): React.JSX.Element {
  return (
    <article>
      <header className="border-b border-border pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Effective {effectiveDate}
        </p>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {summary}
        </p>
      </header>

      <nav aria-label="Table of contents" className="border-b border-border py-8">
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
          On this page
        </p>
        <ol className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
          {sections.map((section, index) => (
            <li key={section.id}>
              <Link
                href={`#${section.id}`}
                className="inline-flex gap-2 text-muted-foreground hover:text-foreground"
              >
                <span className="tabular-nums text-muted-foreground/70">
                  {index + 1}.
                </span>
                {section.title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="divide-y divide-border">{children}</div>
    </article>
  );
}

type LegalSectionProps = {
  id: string;
  index: number;
  title: string;
  children: React.ReactNode;
};

export function LegalSection({
  id,
  index,
  title,
  children,
}: LegalSectionProps): React.JSX.Element {
  return (
    <section id={id} className="scroll-mt-24 py-8 first:pt-8">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        <span className="tabular-nums text-muted-foreground">{index}.</span>{" "}
        {title}
      </h2>
      <div
        className={[
          "mt-3 space-y-4 text-[15px] leading-relaxed text-muted-foreground",
          "[&_strong]:font-semibold [&_strong]:text-foreground",
          "[&_a]:font-medium [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:no-underline",
          "[&_h3]:pt-1 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-foreground",
          "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
          "[&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5",
          "[&_li]:leading-relaxed [&_li>ul]:mt-1.5 [&_li>ol]:mt-1.5",
        ].join(" ")}
      >
        {children}
      </div>
    </section>
  );
}
