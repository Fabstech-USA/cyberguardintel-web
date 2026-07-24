"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { PlanLimitUpgradePrompt } from "@/components/integrations/PlanLimitUpgradePrompt";
import { EvidenceCollectedBulletin } from "@/components/integrations/EvidenceCollectedBulletin";
import { CredentialSetupGuidePanel } from "@/components/integrations/CredentialSetupGuidePanel";
import { IntegrationConnectLink } from "@/components/integrations/IntegrationConnectLink";
import { HelpTip } from "@/components/shared/HelpTip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isDemoIamIntegrationType,
  isDemoIntegrationType,
  isDemoOAuthIntegrationType,
} from "@/lib/demo-integrations";
import {
  getCatalogEntry,
  getCategoryLabel,
  getConnectHref,
  isOAuthAuthMethod,
} from "@/lib/integration-catalog";
import { getCredentialFields } from "@/lib/integration-credential-fields";
import { getCredentialSetupGuideOrDefault } from "@/lib/integration-credential-guides";
import { getEvidenceCollected } from "@/lib/integration-evidence";
import { getIntegrationIconPath } from "@/lib/integration-icons";

type LimitErrorState = {
  used?: number;
  limit?: number;
};

export default function ConnectIntegrationPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const type = params.type;
  const entry = getCatalogEntry(type);
  const fields = getCredentialFields(type);
  const isDemo = isDemoIntegrationType(type);
  const isDemoOAuth = isDemoOAuthIntegrationType(type);
  const isDemoIam = isDemoIamIntegrationType(type);
  const iconId = entry?.iconId ?? entry?.id ?? type;
  const iconPath = getIntegrationIconPath(iconId);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ""]))
  );
  const [error, setError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<LimitErrorState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthStep, setOauthStep] = useState<"idle" | "authorizing">("idle");

  if (!entry) {
    return (
      <main className="flex w-full flex-1 flex-col gap-2 p-8">
        <h1 className="text-2xl font-semibold">Integration not found</h1>
        <Link href="/integrations" className="text-sm text-primary underline">
          Back to integrations
        </Link>
      </main>
    );
  }

  const evidenceItems = getEvidenceCollected(entry.id, entry.description);
  const credentialGuide = getCredentialSetupGuideOrDefault(
    type,
    fields.length > 0 && !isOAuthAuthMethod(entry.authMethod)
  );

  async function connectIntegration(credentials: Record<string, string>) {
    setSubmitting(true);
    setError(null);
    setLimitError(null);

    const response = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, credentials }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as {
        error?: string;
        limit?: number;
        used?: number;
      };
      if (payload.error === "integration_limit_reached") {
        setLimitError({ used: payload.used, limit: payload.limit });
      } else {
        setError(payload.error ?? "Failed to connect integration");
      }
      setSubmitting(false);
      setOauthStep("idle");
      return;
    }

    router.push(`/integrations?connected=${type}`);
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await connectIntegration(isDemo && !isDemoIam ? {} : values);
  }

  async function handleDemoOAuthConnect() {
    setOauthStep("authorizing");
    await new Promise((resolve) => setTimeout(resolve, 1400));
    await connectIntegration({});
  }

  if (isDemoOAuth) {
    return (
      <main className="flex w-full flex-1 flex-col gap-4 p-8">
        <h1 className="text-2xl font-semibold">Connect {entry.name}</h1>
        <p className="text-sm text-muted-foreground">
          {getCategoryLabel(entry.category)} · {entry.authMethod}
        </p>

        <div className="flex max-w-md flex-col gap-4 rounded-md border p-6">
          <p className="text-sm">{entry.description}</p>

          <EvidenceCollectedBulletin items={evidenceItems} />

          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Permissions requested
            </p>
            <ul className="mt-2 space-y-1 text-sm text-foreground">
              <li>Read directory users and group membership</li>
              <li>Read admin role assignments</li>
              <li>Read Drive sharing and security settings</li>
            </ul>
          </div>

          {limitError ? (
            <PlanLimitUpgradePrompt
              used={limitError.used}
              limit={limitError.limit}
            />
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            type="button"
            disabled={submitting}
            className="h-11 gap-2 bg-white text-[#3c4043] shadow-sm ring-1 ring-[#dadce0] hover:bg-[#f8f9fa]"
            onClick={() => void handleDemoOAuthConnect()}
          >
            {iconPath ? (
              <Image
                src={iconPath}
                alt=""
                width={20}
                height={20}
                className="size-5"
              />
            ) : null}
            {oauthStep === "authorizing"
              ? "Authorizing with Google…"
              : "Connect with Google"}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            You will be redirected to Google to sign in and approve access.
          </p>

          <Link
            href="/integrations"
            className="text-center text-sm text-muted-foreground underline"
          >
            Cancel
          </Link>
        </div>
      </main>
    );
  }

  if (isOAuthAuthMethod(entry.authMethod)) {
    return (
      <main className="flex w-full flex-1 flex-col gap-4 p-8">
        <h1 className="text-2xl font-semibold">Connect {entry.name}</h1>
        <p className="text-sm text-muted-foreground">
          {getCategoryLabel(entry.category)} · {entry.authMethod}
        </p>
        <div className="flex max-w-md flex-col gap-3 rounded-md border p-6">
          <p className="text-sm">{entry.description}</p>
          <EvidenceCollectedBulletin items={evidenceItems} />
          {entry.connectable ? (
            <Button asChild>
              <IntegrationConnectLink href={getConnectHref(entry)}>
                Connect with {entry.name}
              </IntegrationConnectLink>
            </Button>
          ) : (
            <Button disabled>Coming soon</Button>
          )}
          <Link href="/integrations" className="text-sm text-muted-foreground underline">
            Back to integrations
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Connect {entry.name}</h1>
      <p className="text-sm text-muted-foreground">
        {getCategoryLabel(entry.category)} · {entry.authMethod}
      </p>

      {!entry.connectable ? (
        <div className="max-w-md rounded-md border p-6 text-sm text-muted-foreground">
          This integration is not connectable yet.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex max-w-md flex-col gap-4 rounded-md border p-6"
        >
          <p className="text-sm">{entry.description}</p>

          <EvidenceCollectedBulletin items={evidenceItems} />

          {credentialGuide ? (
            <CredentialSetupGuidePanel guide={credentialGuide} />
          ) : null}

          {fields.length > 0 ? (
            <div className="flex items-center gap-1.5 text-sm font-medium">
              Credentials
              <HelpTip content="Use a read-only IAM user or API token so we can collect compliance evidence without changing your systems. Credentials are encrypted at rest." />
            </div>
          ) : null}

          {isDemoIam && !credentialGuide ? (
            <p className="text-xs text-muted-foreground">
              Enter your IAM access keys. Credentials are encrypted at rest and
              used only for read-only evidence collection.
            </p>
          ) : null}

          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`cred-${field.key}`}>{field.label}</Label>
              {field.options && field.options.length > 0 ? (
                <Select
                  value={values[field.key] ?? field.defaultValue ?? ""}
                  onValueChange={(value) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.key]: value,
                    }))
                  }
                  required
                >
                  <SelectTrigger id={`cred-${field.key}`} className="w-full">
                    <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`cred-${field.key}`}
                  type={field.inputType ?? "text"}
                  value={values[field.key] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                  required
                  autoComplete="off"
                />
              )}
            </div>
          ))}

          {limitError ? (
            <PlanLimitUpgradePrompt
              used={limitError.used}
              limit={limitError.limit}
            />
          ) : null}
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Connecting…" : "Connect"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/integrations">Cancel</Link>
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}
