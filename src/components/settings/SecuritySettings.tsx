"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIMEOUT_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 480, label: "8 hours" },
] as const;

type TimeoutValue = (typeof TIMEOUT_OPTIONS)[number]["value"];

type SecurityResponse = {
  sessionTimeoutMinutes: number;
  mfa: {
    currentUserEnabled: boolean;
    membersWithMfa: number;
    memberCount: number;
  };
  encryption: {
    credentialsAtRest: boolean;
    algorithm: string;
  };
};

function isTimeoutValue(value: number): value is TimeoutValue {
  return TIMEOUT_OPTIONS.some((opt) => opt.value === value);
}

export function SecuritySettings() {
  const [data, setData] = useState<SecurityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/security");
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Failed to load security settings");
      }
      setData((await res.json()) as SecurityResponse);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load security settings"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateTimeout(next: TimeoutValue) {
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionTimeoutMinutes: next }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Failed to update session timeout");
      }
      setData((prev) =>
        prev ? { ...prev, sessionTimeoutMinutes: next } : prev
      );
      setSaveMessage("Session timeout saved.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update session timeout"
      );
    } finally {
      setSaving(false);
    }
  }

  async function exportAuditLog() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/audit-log/export");
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Failed to export audit log");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "audit-log.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export audit log");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Loading security…</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <p className="text-sm text-destructive">{error ?? "Unable to load security"}</p>
        <Button className="mt-3" variant="outline" size="sm" onClick={() => void load()}>
          Retry
        </Button>
      </Card>
    );
  }

  const timeoutValue = isTimeoutValue(data.sessionTimeoutMinutes)
    ? data.sessionTimeoutMinutes
    : 30;

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {saveMessage ? (
        <p className="text-sm text-muted-foreground">{saveMessage}</p>
      ) : null}

      <Card className="space-y-3 p-6">
        <h2 className="text-lg font-semibold">Session timeout</h2>
        <p className="text-sm text-muted-foreground">
          Preferred idle timeout for this organization. Absolute session lifetime
          is still controlled in the Clerk Dashboard.
        </p>
        <div className="max-w-xs space-y-2">
          <Label htmlFor="session-timeout">Timeout</Label>
          <Select
            value={String(timeoutValue)}
            disabled={saving}
            onValueChange={(value) => {
              const next = Number(value);
              if (isTimeoutValue(next)) {
                void updateTimeout(next);
              }
            }}
          >
            <SelectTrigger id="session-timeout">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEOUT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="text-lg font-semibold">Multi-factor authentication</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Your account</dt>
            <dd className="font-medium">
              {data.mfa.currentUserEnabled ? "MFA enabled" : "MFA not enabled"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Organization coverage</dt>
            <dd className="font-medium tabular-nums">
              {data.mfa.membersWithMfa} of {data.mfa.memberCount} members
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          Manage MFA in your Clerk account security settings. See{" "}
          <Link href="/settings/members" className="underline underline-offset-2">
            Members
          </Link>{" "}
          for per-member status.
        </p>
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="text-lg font-semibold">Encryption</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Credentials at rest</dt>
            <dd className="font-medium">
              {data.encryption.credentialsAtRest ? "Enabled" : "Not configured"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Algorithm</dt>
            <dd className="font-medium">{data.encryption.algorithm}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          Integration credentials and sensitive payloads are encrypted with{" "}
          {data.encryption.algorithm} when encryption is configured.
        </p>
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="text-lg font-semibold">Audit log</h2>
        <p className="text-sm text-muted-foreground">
          Download the last 90 days of organization audit events as CSV.
        </p>
        <Button
          variant="outline"
          disabled={exporting}
          onClick={() => void exportAuditLog()}
        >
          {exporting ? "Exporting…" : "Export audit log CSV"}
        </Button>
      </Card>
    </div>
  );
}
