import { Capabilities } from "@/components/marketing/Capabilities";
import { FinalCta } from "@/components/marketing/FinalCta";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { IntegrationsStrip } from "@/components/marketing/IntegrationsStrip";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PricingTeaser } from "@/components/marketing/PricingTeaser";
import { ProblemSection } from "@/components/marketing/ProblemSection";
import { TrustSection } from "@/components/marketing/TrustSection";

export function MarketingHomePage(): React.JSX.Element {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <MarketingNav />
      <main className="flex-1">
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <Capabilities />
        <IntegrationsStrip />
        <TrustSection />
        <PricingTeaser />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
