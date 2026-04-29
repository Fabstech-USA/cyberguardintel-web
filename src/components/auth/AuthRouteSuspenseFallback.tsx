/**
 * Shown while `useSearchParams()` / auth route gates hydrate. Keeps copy distinct
 * from the post-auth gate so users know they’re on the sign-in/up step.
 */
export function AuthRouteSuspenseFallback(): React.JSX.Element {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-8 text-center">
      <span
        className="inline-block size-8 animate-spin rounded-full border-[3px] border-brand/20 border-t-brand"
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Loading sign-in…</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          If you’re accepting an invitation, the next screen may ask you to verify you’re human —
          that’s normal for org security.
        </p>
      </div>
    </div>
  );
}
