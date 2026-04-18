export function AuthDivider() {
  return (
    <div className="flex items-center gap-3" role="separator" aria-orientation="horizontal">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        or
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
