"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getCatalogEntry,
  getCategoryLabel,
  getConnectHref,
  isOAuthAuthMethod,
} from "@/lib/integration-catalog";
import { getCredentialFields } from "@/lib/integration-credential-fields";

export default function ConnectIntegrationPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const type = params.type;
  const entry = getCatalogEntry(type);
  const fields = getCredentialFields(type);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ""]))
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  if (isOAuthAuthMethod(entry.authMethod)) {
    return (
      <main className="flex w-full flex-1 flex-col gap-4 p-8">
        <h1 className="text-2xl font-semibold">Connect {entry.name}</h1>
        <p className="text-sm text-muted-foreground">
          {getCategoryLabel(entry.category)} · {entry.authMethod}
        </p>
        <div className="flex max-w-md flex-col gap-3 rounded-md border p-6">
          <p className="text-sm">{entry.description}</p>
          {entry.connectable ? (
            <Button asChild>
              <Link href={getConnectHref(entry)}>
                Connect with {entry.name}
              </Link>
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        credentials: values,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as {
        error?: string;
        limit?: number;
        used?: number;
      };
      if (payload.error === "integration_limit_reached") {
        setError(
          `Integration limit reached (${payload.used}/${payload.limit}). Upgrade your plan to connect more.`
        );
      } else {
        setError(payload.error ?? "Failed to connect integration");
      }
      setSubmitting(false);
      return;
    }

    router.push(`/integrations?connected=${type}`);
    router.refresh();
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

          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`cred-${field.key}`}>{field.label}</Label>
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
            </div>
          ))}

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
