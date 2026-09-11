import type { Metadata } from "next";

import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { ENTERPRISE_SALES_EMAIL } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for CyberGuardIntel AI, the HIPAA compliance readiness platform operated by Fabstech LLC.",
};

const EFFECTIVE_DATE = "September 10, 2026";
const LEGAL_EMAIL = "legal@notifications.cyberguardintel.ai";

const SECTIONS = [
  { id: "acceptance", title: "Acceptance of these Terms" },
  { id: "the-service", title: "The Service" },
  { id: "accounts", title: "Accounts, organizations, and security" },
  { id: "trial", title: "Free trial" },
  { id: "billing", title: "Subscriptions and billing" },
  { id: "cancellation", title: "Cancellation and refunds" },
  { id: "acceptable-use", title: "Acceptable use" },
  { id: "your-data", title: "Your data and content" },
  { id: "ai-content", title: "AI-generated content" },
  { id: "phi", title: "Protected health information" },
  { id: "integrations", title: "Third-party integrations" },
  { id: "ip", title: "Intellectual property" },
  { id: "confidentiality", title: "Confidentiality" },
  { id: "disclaimers", title: "Disclaimers" },
  { id: "liability", title: "Limitation of liability" },
  { id: "indemnification", title: "Indemnification" },
  { id: "term", title: "Term, suspension, and termination" },
  { id: "changes", title: "Changes to the Service or these Terms" },
  { id: "governing-law", title: "Governing law and disputes" },
  { id: "general", title: "General provisions" },
  { id: "contact", title: "Contact us" },
] as const;

export default function TermsOfServicePage(): React.JSX.Element {
  return (
    <LegalDocument
      title="Terms of Service"
      effectiveDate={EFFECTIVE_DATE}
      summary="These Terms of Service (“Terms”) govern access to and use of CyberGuardIntel AI (the “Service”), provided by Fabstech LLC (“Fabstech,” “we,” “us,” or “our”). By creating an account, starting a trial, or otherwise using the Service, you agree to these Terms on behalf of yourself and, if applicable, the organization you represent (“Customer,” “you”)."
      sections={SECTIONS}
    >
      <LegalSection id="acceptance" index={1} title="Acceptance of these Terms">
        <p>
          By accessing or using the Service you confirm that you have the
          authority to bind your organization to these Terms and that you
          accept them. If you do not agree, do not use the Service. If we
          make material changes, we will let you know as described in{" "}
          <a href="#changes">Changes to the Service or these Terms</a>.
        </p>
      </LegalSection>

      <LegalSection id="the-service" index={2} title="The Service">
        <p>
          CyberGuardIntel AI helps healthcare organizations and health-tech
          vendors get ready for HIPAA (and, on our roadmap, additional
          frameworks such as SOC 2 and PCI-DSS). The Service includes:
        </p>
        <ul>
          <li>
            AI-assisted drafting of policies and risk assessments, which stay
            in <strong>draft status until a qualified person on your team
            reviews and approves them</strong>;
          </li>
          <li>
            control-mapped evidence collection through integrations you
            configure and authorize;
          </li>
          <li>
            a PHI system map, BAA tracker, and audit-package export for
            organizing your HIPAA compliance program; and
          </li>
          <li>
            related dashboards, reminders, and reporting features.
          </li>
        </ul>
        <p>
          The Service is a compliance-readiness tool, not a law firm, a
          certification body, or a substitute for your own compliance,
          security, or legal judgment. See{" "}
          <a href="#ai-content">AI-generated content</a> below.
        </p>
      </LegalSection>

      <LegalSection id="accounts" index={3} title="Accounts, organizations, and security">
        <p>
          Accounts are created and authenticated through our identity
          provider, Clerk, including via Google, Microsoft, or GitHub
          sign-in. Multi-factor authentication is enforced on every account
          and every plan. You are responsible for:
        </p>
        <ul>
          <li>keeping your login credentials and MFA methods secure;</li>
          <li>
            all activity that occurs under your account or your
            organization&rsquo;s account, including actions by members you
            invite; and
          </li>
          <li>
            promptly removing access for members who should no longer have
            it (for example, employees who have left your organization).
          </li>
        </ul>
        <p>
          Organization owners and admins can manage members, roles, and
          integrations for their organization. We are not responsible for
          disputes between members of the same organization about access or
          permissions.
        </p>
      </LegalSection>

      <LegalSection id="trial" index={4} title="Free trial">
        <p>
          New organizations may start a 14-day free trial with no credit
          card required. We may change trial length, eligibility, or
          included features at any time, and may limit trials to one per
          organization or business to prevent abuse. At the end of a trial,
          continued use of paid features requires an active subscription.
        </p>
      </LegalSection>

      <LegalSection id="billing" index={5} title="Subscriptions and billing">
        <p>
          Paid plans (currently Starter, Growth, Business, and Enterprise)
          are billed monthly or annually in advance through our payment
          processor, Stripe. We do not store your full payment card details;
          Stripe handles that on our behalf.
        </p>
        <ul>
          <li>
            Subscriptions renew automatically at the end of each billing
            period unless cancelled before renewal.
          </li>
          <li>
            Plan limits (seats, integrations, frameworks, policies) are
            described on our pricing page and may be enforced technically
            within the Service.
          </li>
          <li>
            Upgrades take effect immediately, with a prorated charge for the
            remainder of the current period; downgrades take effect at the
            start of the next billing period.
          </li>
          <li>
            Enterprise plans are quoted separately; contact{" "}
            <a href={`mailto:${ENTERPRISE_SALES_EMAIL}`}>
              {ENTERPRISE_SALES_EMAIL}
            </a>{" "}
            for a custom agreement, which controls over these Terms for that
            account where the two conflict.
          </li>
          <li>
            Fees are exclusive of taxes; you are responsible for any
            applicable taxes other than our income tax.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="cancellation" index={6} title="Cancellation and refunds">
        <p>
          You may cancel your subscription at any time from your
          organization&rsquo;s billing settings. Cancellation takes effect
          at the end of your current billing period, and you will keep
          access to paid features until then. Except where required by
          applicable law, fees already paid are non-refundable, including
          for partial billing periods or unused seats.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" index={7} title="Acceptable use">
        <p>You agree not to, and not to permit others to:</p>
        <ul>
          <li>
            use the Service to violate any law or the privacy or security
            rights of others;
          </li>
          <li>
            upload content you do not have the right to upload, or that
            infringes a third party&rsquo;s intellectual property rights;
          </li>
          <li>
            attempt to gain unauthorized access to the Service, other
            accounts, or connected third-party integrations beyond the
            access you have configured and are authorized to use;
          </li>
          <li>
            reverse engineer, decompile, or attempt to extract the source
            code of the Service, except where applicable law permits it
            despite this restriction;
          </li>
          <li>
            probe, scan, or test the vulnerability of the Service or any
            connected system without our prior written consent;
          </li>
          <li>
            use the Service to build a competing product, or to train a
            competing AI model on our outputs; or
          </li>
          <li>
            interfere with or disrupt the integrity or performance of the
            Service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="your-data" index={8} title="Your data and content">
        <p>
          As between you and us, you (or your organization) own the content
          you submit to the Service, including uploaded evidence files,
          policy drafts, risk assessments, PHI system map entries, and BAA
          records (&ldquo;Customer Data&rdquo;). You grant us a
          worldwide, non-exclusive license to host, process, transmit, and
          display Customer Data solely to provide, maintain, and improve
          the Service for you.
        </p>
        <p>
          You are responsible for the accuracy, quality, and legality of
          Customer Data and for having the rights needed to submit it and to
          authorize the third-party integrations you connect. Evidence files
          are encrypted at rest (AES-256/SSE-KMS) in our cloud storage, and
          downloads use signed links that expire shortly after they are
          issued.
        </p>
      </LegalSection>

      <LegalSection id="ai-content" index={9} title="AI-generated content">
        <p>
          Certain features use AI models (including third-party AI providers)
          to draft policies, risk assessments, and related content from
          information you provide. This AI-generated content:
        </p>
        <ul>
          <li>
            is always created with a <strong>draft</strong> status and is
            never presented to auditors, regulators, or third parties as
            final until a qualified person at your organization reviews and
            approves it;
          </li>
          <li>
            may be incomplete, out of date, or inaccurate, and is provided as
            a starting point only; and
          </li>
          <li>
            does <strong>not</strong> constitute legal, medical, clinical, or
            compliance advice, and is not a substitute for review by
            qualified counsel or compliance personnel.
          </li>
        </ul>
        <p>
          You are solely responsible for reviewing, editing, and approving
          any AI-generated content before relying on it or submitting it to
          any third party, auditor, or regulator.
        </p>
      </LegalSection>

      <LegalSection id="phi" index={10} title="Protected health information">
        <p>
          The Service is designed to help you assess and document your
          organization&rsquo;s HIPAA posture &mdash; for example, by mapping
          which systems touch protected health information (&ldquo;PHI&rdquo;)
          &mdash; rather than to store PHI itself. Unless we have agreed
          otherwise in writing (including under a Business Associate
          Agreement as described below), you agree not to upload actual PHI
          or other regulated patient data into free-text fields, evidence
          files, or any other part of the Service beyond what is reasonably
          necessary and clearly identified as such.
        </p>
        <p>
          If your organization is a HIPAA Covered Entity or Business
          Associate and needs us to sign a Business Associate Agreement
          (&ldquo;BAA&rdquo;) covering PHI you process through the Service,
          contact{" "}
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. The BAA
          Tracker feature, which helps you manage BAAs between your
          organization and your own vendors, is a separate, distinct
          arrangement from any BAA between you and Fabstech.
        </p>
      </LegalSection>

      <LegalSection id="integrations" index={11} title="Third-party integrations">
        <p>
          You may connect third-party services (cloud providers, identity
          providers, productivity, communication, storage, engineering, and
          security tools) to collect compliance-relevant evidence. You are
          responsible for having the authority to connect each integration
          and for complying with that provider&rsquo;s own terms. We only
          access the scopes and metadata needed to map evidence to controls;
          we do not control, and are not responsible for, the availability,
          security, or practices of third-party services.
        </p>
      </LegalSection>

      <LegalSection id="ip" index={12} title="Intellectual property">
        <p>
          Fabstech and its licensors own all right, title, and interest in
          the Service, including its software, design, and the
          &ldquo;CyberGuardIntel AI&rdquo; name and logo, excluding Customer
          Data. Nothing in these Terms transfers any of that intellectual
          property to you. If you send us feedback or suggestions, you grant
          us the right to use them without restriction or obligation to you.
        </p>
      </LegalSection>

      <LegalSection id="confidentiality" index={13} title="Confidentiality">
        <p>
          Each party may receive non-public information from the other
          (&ldquo;Confidential Information&rdquo;). Each party will use the
          other&rsquo;s Confidential Information only to perform its
          obligations under these Terms, protect it with reasonable care,
          and not disclose it to third parties except to personnel,
          contractors, or service providers who need it and are bound by
          similar confidentiality obligations, or as required by law.
        </p>
      </LegalSection>

      <LegalSection id="disclaimers" index={14} title="Disclaimers">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as
          available,&rdquo; without warranties of any kind, whether express,
          implied, or statutory, including implied warranties of
          merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that the Service will be
          uninterrupted, error-free, or fully secure, or that using the
          Service will result in passing any audit or certification. We
          currently describe our security practices as HIPAA-aligned, and
          SOC 2 support is on our roadmap; neither is a certification unless
          we state otherwise in writing.
        </p>
      </LegalSection>

      <LegalSection id="liability" index={15} title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, neither party will be
          liable for indirect, incidental, special, consequential, or
          punitive damages, or for lost profits, revenue, or data, arising
          from these Terms or the Service, even if advised of the
          possibility. Each party&rsquo;s total liability arising from
          these Terms will not exceed the amount you paid us in the twelve
          (12) months before the claim arose. These limits do not apply to
          a party&rsquo;s indemnification obligations, confidentiality
          breaches, or liability that cannot be limited by law.
        </p>
      </LegalSection>

      <LegalSection id="indemnification" index={16} title="Indemnification">
        <p>
          You will defend, indemnify, and hold Fabstech harmless from
          third-party claims arising from your Customer Data, your use of
          the Service in violation of these Terms, or your violation of
          applicable law. We will defend, indemnify, and hold you harmless
          from third-party claims that the Service, as provided by us,
          infringes that third party&rsquo;s intellectual property rights.
        </p>
      </LegalSection>

      <LegalSection id="term" index={17} title="Term, suspension, and termination">
        <p>
          These Terms remain in effect while you use the Service. We may
          suspend or terminate access if you materially breach these Terms
          and do not cure the breach within a reasonable period after
          notice, or immediately if needed to prevent harm to the Service,
          other customers, or third parties. You may terminate by cancelling
          your subscription and discontinuing use of the Service.
        </p>
        <p>
          Upon termination, your right to access the Service ends. We will
          make reasonable efforts to let you export Customer Data for a
          limited period after termination, after which we may delete it in
          accordance with our data retention practices.
        </p>
      </LegalSection>

      <LegalSection id="changes" index={18} title="Changes to the Service or these Terms">
        <p>
          We may update the Service and these Terms from time to time. For
          material changes, we will provide notice by posting an updated
          &ldquo;Effective&rdquo; date on this page and, where appropriate,
          by emailing the account owner or showing an in-app notice.
          Continued use of the Service after changes take effect constitutes
          acceptance of the updated Terms.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" index={19} title="Governing law and disputes">
        <p>
          These Terms are governed by the laws of the State of
          Delaware, United States, without regard to conflict-of-laws
          principles. Any dispute not resolved informally will be brought
          exclusively in the state or federal courts located in Delaware,
          and each party consents to that jurisdiction and venue.
        </p>
      </LegalSection>

      <LegalSection id="general" index={20} title="General provisions">
        <ul>
          <li>
            <strong>Entire agreement.</strong> These Terms, together with
            any order form or enterprise agreement, are the entire agreement
            between you and Fabstech regarding the Service.
          </li>
          <li>
            <strong>Assignment.</strong> You may not assign these Terms
            without our consent; we may assign them in connection with a
            merger, acquisition, or sale of assets.
          </li>
          <li>
            <strong>Severability.</strong> If any provision is found
            unenforceable, the remaining provisions stay in effect.
          </li>
          <li>
            <strong>No waiver.</strong> Failure to enforce a provision is not
            a waiver of it.
          </li>
          <li>
            <strong>Force majeure.</strong> Neither party is liable for
            delays caused by events beyond its reasonable control.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="contact" index={21} title="Contact us">
        <p>
          Questions about these Terms can be sent to{" "}
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. Fabstech LLC
          is the operator of CyberGuardIntel AI.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
