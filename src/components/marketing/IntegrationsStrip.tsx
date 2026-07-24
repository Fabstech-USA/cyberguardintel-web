import Image from "next/image";

import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { getIntegrationIconPath } from "@/lib/integration-icons";

const INTEGRATIONS = [
  { slug: "aws", name: "AWS" },
  { slug: "okta", name: "Okta" },
  { slug: "google-workspace", name: "Google Workspace" },
  { slug: "microsoft-365", name: "Microsoft 365" },
  { slug: "github", name: "GitHub" },
  { slug: "slack", name: "Slack" },
  { slug: "azure", name: "Azure" },
  { slug: "datadog", name: "Datadog" },
  { slug: "jira", name: "Jira" },
  { slug: "1password", name: "1Password" },
] as const;

export function IntegrationsStrip(): React.JSX.Element {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Evidence from the tools you already trust
            </h2>
            <p className="mt-3 text-pretty text-sm text-muted-foreground sm:text-base">
              Connect integrations so control-mapped evidence collects itself.
              Sync runs about every 24 hours.
            </p>
          </div>
        </ScrollReveal>

        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-6 sm:gap-x-10">
          {INTEGRATIONS.map((item) => {
            const iconPath =
              getIntegrationIconPath(item.slug) ??
              `/integrations/icons/${item.slug}.svg`;

            return (
              <li
                key={item.slug}
                className="flex items-center gap-2.5 text-sm text-muted-foreground"
              >
                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-0.5 ring-1 ring-border/40">
                  <Image
                    src={iconPath}
                    alt=""
                    width={28}
                    height={28}
                    className="size-full object-contain"
                    unoptimized
                  />
                </span>
                <span className="hidden sm:inline">{item.name}</span>
                <span className="sr-only sm:hidden">{item.name}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
