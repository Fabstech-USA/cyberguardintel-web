import type { Metadata } from "next";

import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { ENTERPRISE_SALES_EMAIL } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Fabstech LLC collects, uses, and protects information for CyberGuardIntel AI, the HIPAA compliance readiness platform.",
};

const EFFECTIVE_DATE = "September 10, 2026";
const PRIVACY_EMAIL = "privacy@notifications.cyberguardintel.ai";

const SECTIONS = [
  { id: "scope", title: "Scope of this policy" },
  { id: "information-we-collect", title: "Information we collect" },
  { id: "how-we-use-it", title: "How we use information" },
  { id: "ai-processing", title: "AI processing" },
  { id: "sharing", title: "How we share information" },
  { id: "phi", title: "Protected health information" },
  { id: "cookies", title: "Cookies and similar technologies" },
  { id: "security", title: "Security" },
  { id: "retention", title: "Data retention" },
  { id: "your-rights", title: "Your rights and choices" },
  { id: "children", title: "Children's privacy" },
  { id: "international", title: "International data transfers" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact us" },
] as const;

export default function PrivacyPolicyPage(): React.JSX.Element {
  return (
    <LegalDocument
      title="Privacy Policy"
      effectiveDate={EFFECTIVE_DATE}
      summary="This Privacy Policy explains how Fabstech LLC (“Fabstech,” “we,” “us,” or “our”) collects, uses, and shares information in connection with CyberGuardIntel AI (the “Service”), including our marketing site and the application used by our customers (“Customers”) and their authorized users."
      sections={SECTIONS}
    >
      <LegalSection id="scope" index={1} title="Scope of this policy">
        <p>
          This policy covers information we collect through our website,
          the CyberGuardIntel AI application, and related communications. It
          does not cover the content of Customer Data itself (the policies,
          evidence, and compliance records you store in the Service), which
          is governed by our{" "}
          <a href="/legal/terms">Terms of Service</a> and, where applicable,
          a separate data processing or Business Associate Agreement with
          your organization.
        </p>
        <p>
          If you are an individual whose information appears in a
          Customer&rsquo;s account (for example, as a named control owner or
          BAA contact), that Customer is responsible for that data and you
          should direct privacy requests to them; we act on their
          instructions with respect to that content.
        </p>
      </LegalSection>

      <LegalSection
        id="information-we-collect"
        index={2}
        title="Information we collect"
      >
        <h3>Account and identity information</h3>
        <p>
          When you or your organization sign up, our identity provider,
          Clerk, collects your name, work email address, and authentication
          details, including OAuth identifiers if you sign in with Google,
          Microsoft, or GitHub, and multi-factor authentication metadata
          (MFA is required on every account).
        </p>
        <h3>Billing information</h3>
        <p>
          Subscription and billing details (plan, seat count, billing
          contact) are processed through Stripe, our payment processor.
          Stripe collects and stores your payment card details directly; we
          do not store full card numbers ourselves.
        </p>
        <h3>Content you provide</h3>
        <p>
          This includes uploaded evidence files, AI-drafted and approved
          policies and risk assessments, PHI system map entries, BAA
          tracker records, and other information you enter into the
          Service.
        </p>
        <h3>Integration data</h3>
        <p>
          When you connect a third-party tool (for example, a cloud
          provider, identity provider, or engineering tool) we collect the
          metadata needed to map evidence to compliance controls, limited to
          the scopes you authorize during that connection.
        </p>
        <h3>Usage and device information</h3>
        <p>
          We collect standard technical information such as IP address,
          browser type, device information, pages visited, and timestamps,
          primarily through server logs and the audit log we maintain for
          HIPAA-relevant actions in your account.
        </p>
        <h3>Support and other communications</h3>
        <p>
          If you email us, request a demo, or contact support, we collect
          the information you provide, including inbound emails processed
          through our email provider, Resend.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use-it" index={3} title="How we use information">
        <ul>
          <li>Provide, operate, and maintain the Service;</li>
          <li>
            authenticate accounts and enforce multi-factor authentication
            and organization-level access controls;
          </li>
          <li>
            process payments and manage subscriptions through Stripe;
          </li>
          <li>
            generate AI-assisted drafts of policies and risk assessments
            from the information you provide (see{" "}
            <a href="#ai-processing">AI processing</a>);
          </li>
          <li>
            maintain the audit log required for HIPAA-relevant actions in
            your account and to help you demonstrate compliance;
          </li>
          <li>
            send transactional email such as verification codes, invitations,
            BAA expiration reminders, and billing notices;
          </li>
          <li>
            respond to support requests and, if you opt in, send product
            updates or marketing communications;
          </li>
          <li>
            detect, investigate, and prevent fraud, abuse, and security
            incidents; and
          </li>
          <li>comply with legal obligations.</li>
        </ul>
      </LegalSection>

      <LegalSection id="ai-processing" index={4} title="AI processing">
        <p>
          To draft policies, risk assessments, and similar content, the
          Service sends the relevant portions of your input to a
          third-party AI provider (Anthropic) under that provider&rsquo;s
          business-tier terms, which by default do not permit use of your
          prompts or outputs to train their models. AI output is stored as
          part of your Customer Data and always begins in draft status,
          requiring human review before it is finalized. See{" "}
          <a href="/legal/terms#ai-content">
            AI-generated content in our Terms
          </a>{" "}
          for more detail on how draft content is handled.
        </p>
      </LegalSection>

      <LegalSection id="sharing" index={5} title="How we share information">
        <p>
          We do not sell your personal information. We share information
          with:
        </p>
        <ul>
          <li>
            <strong>Service providers (subprocessors)</strong> who process
            information on our behalf to run the Service, currently
            including: Clerk (authentication and MFA), Stripe (billing and
            payments), Amazon Web Services (encrypted evidence file
            storage), Vercel (application hosting), Resend (transactional
            email), and Anthropic (AI-assisted drafting, as described
            above);
          </li>
          <li>
            <strong>your own connected integrations</strong>, to the extent
            you authorize the Service to read data from them &mdash; we do
            not send your Customer Data to these tools unless you
            configure a feature that does so;
          </li>
          <li>
            <strong>professional advisors</strong> such as auditors,
            accountants, or lawyers, under confidentiality obligations;
          </li>
          <li>
            <strong>legal and safety purposes</strong>, if required by law,
            subpoena, or other legal process, or to protect the rights,
            property, or safety of Fabstech, our customers, or others; and
          </li>
          <li>
            <strong>a successor</strong>, in connection with a merger,
            acquisition, financing, or sale of assets, subject to
            appropriate confidentiality protections.
          </li>
        </ul>
        <p>
          We maintain a current list of subprocessors and will update it as
          our vendor relationships change; contact{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> for the
          latest list or to be notified of changes.
        </p>
      </LegalSection>

      <LegalSection id="phi" index={6} title="Protected health information">
        <p>
          The Service is built to help you document your organization&rsquo;s
          HIPAA posture &mdash; for example, mapping which of your systems
          touch protected health information (&ldquo;PHI&rdquo;) &mdash;
          without needing you to store actual PHI in the Service. We ask
          Customers not to upload real patient data or other regulated PHI
          into the Service unless we have a Business Associate Agreement in
          place covering that data, as described in our{" "}
          <a href="/legal/terms#phi">Terms of Service</a>. If your
          organization needs a BAA with us, contact{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection
        id="cookies"
        index={7}
        title="Cookies and similar technologies"
      >
        <p>
          We keep tracking technology minimal. The Service uses:
        </p>
        <ul>
          <li>
            <strong>Authentication cookies</strong> set by Clerk, required
            to keep you signed in and to isolate sessions between
            organizations;
          </li>
          <li>
            <strong>Bot-protection cookies</strong> from Clerk&rsquo;s
            CAPTCHA provider (Cloudflare Turnstile), shown on sign-in,
            sign-up, and invitation flows to prevent automated abuse; and
          </li>
          <li>
            <strong>A local theme preference</strong> (light, dark, or
            system) stored in your browser&rsquo;s local storage, not sent
            to our servers.
          </li>
        </ul>
        <p>
          We do not currently use third-party advertising trackers or
          cross-site analytics cookies. If that changes, we will update this
          policy and, where required, request your consent.
        </p>
      </LegalSection>

      <LegalSection id="security" index={8} title="Security">
        <p>We apply layered technical and organizational safeguards, including:</p>
        <ul>
          <li>
            multi-factor authentication enforced on every account and plan;
          </li>
          <li>
            encryption of evidence files at rest (AES-256 / SSE-KMS) and in
            transit;
          </li>
          <li>
            time-limited, signed download links for evidence files, which
            expire shortly after they are issued;
          </li>
          <li>
            encrypted storage of third-party integration credentials, never
            stored in plaintext;
          </li>
          <li>
            tenant isolation, so every query is scoped to your
            organization; and
          </li>
          <li>
            an audit log recording HIPAA-relevant actions taken in your
            account.
          </li>
        </ul>
        <p>
          No system is completely secure, and we cannot guarantee absolute
          security. If we become aware of a breach affecting your
          information, we will notify you in accordance with applicable
          law.
        </p>
      </LegalSection>

      <LegalSection id="retention" index={9} title="Data retention">
        <p>
          We retain account and Customer Data for as long as your
          organization has an active subscription, plus a limited period
          afterward to allow for export or reactivation, after which we
          delete or anonymize it unless a longer period is required. Because
          compliance records such as audit logs, approved policies, and
          evidence often need to remain available to satisfy HIPAA
          documentation requirements, we retain those categories for up to
          six years from creation, consistent with HIPAA&rsquo;s own
          documentation-retention standard, unless you request earlier
          deletion and no legal or contractual obligation requires us to
          keep it longer.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" index={10} title="Your rights and choices">
        <p>
          Depending on where you live, you may have rights to access,
          correct, export, or delete your personal information, or to
          object to or restrict certain processing. You can exercise most of
          these rights directly within the Service (for example, updating
          your profile, or an organization admin removing a member).
          Otherwise, contact{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> and we
          will respond within the time required by applicable law. You can
          opt out of marketing email using the unsubscribe link in any such
          message; you cannot opt out of transactional or security-related
          email needed to operate your account.
        </p>
      </LegalSection>

      <LegalSection id="children" index={11} title="Children's privacy">
        <p>
          The Service is a business tool intended for use by adults acting
          on behalf of an organization. It is not directed to children, and
          we do not knowingly collect personal information from children.
        </p>
      </LegalSection>

      <LegalSection
        id="international"
        index={12}
        title="International data transfers"
      >
        <p>
          We and our service providers may process information in the
          United States and other countries where our infrastructure or
          subprocessors operate. Where required, we rely on appropriate
          safeguards, such as standard contractual clauses, to cover
          transfers of personal information out of the European Economic
          Area, the United Kingdom, or other regions with similar
          requirements. Contact{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> if you
          need more detail about a specific transfer.
        </p>
      </LegalSection>

      <LegalSection id="changes" index={13} title="Changes to this policy">
        <p>
          We may update this policy from time to time. For material
          changes, we will update the &ldquo;Effective&rdquo; date above
          and, where appropriate, notify the account owner by email or
          in-app notice before the change takes effect.
        </p>
      </LegalSection>

      <LegalSection id="contact" index={14} title="Contact us">
        <p>
          Questions about this Privacy Policy or how we handle your
          information can be sent to{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. For
          Enterprise data-processing or security questionnaires, contact{" "}
          <a href={`mailto:${ENTERPRISE_SALES_EMAIL}`}>
            {ENTERPRISE_SALES_EMAIL}
          </a>
          . Fabstech LLC is the operator of CyberGuardIntel AI.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
