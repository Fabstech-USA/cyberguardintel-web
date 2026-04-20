"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  defaultEmail?: string;
};

export function Soc2WaitlistForm({ defaultEmail = "" }: Props): React.JSX.Element {
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/waitlist/soc2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong");
        return;
      }
      setStatus("success");
      setMessage("You’re on the list. We’ll email you when beta opens.");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again in a moment.");
    }
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-stretch"
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="soc2-waitlist-email" className="sr-only">
            Email
          </label>
          <Input
            id="soc2-waitlist-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="admin@yourpractice.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === "loading" || status === "success"}
            className="h-10 bg-background"
          />
        </div>
        <Button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="h-10 shrink-0 bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active sm:px-6"
        >
          {status === "loading" ? "Joining…" : "Join waitlist"}
        </Button>
      </form>
      {message ? (
        <p
          className={
            status === "success" ? "text-sm text-brand" : "text-sm text-destructive"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
