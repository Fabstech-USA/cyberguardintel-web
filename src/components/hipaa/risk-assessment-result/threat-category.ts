// Map a HIPAA Security Rule citation prefix to a human-readable category tag
// shown in the top-right corner of each threat card. The mapping covers the
// most common prefixes the AI emits; everything else falls back to a generic
// "HIPAA Security Rule" label.

const PREFIX_TO_CATEGORY: ReadonlyArray<[RegExp, string]> = [
  [/^164\.308\(a\)\(1\)/, "Risk Management"],
  [/^164\.308\(a\)\(3\)/, "Workforce Security"],
  [/^164\.308\(a\)\(4\)/, "Access Control"],
  [/^164\.308\(a\)\(5\)/, "Workforce Training"],
  [/^164\.308\(a\)\(6\)/, "Incident Response"],
  [/^164\.308\(a\)\(7\)/, "Contingency Planning"],
  [/^164\.308\(b\)/, "Business Associates"],
  [/^164\.310/, "Physical Safeguards"],
  [/^164\.312\(a\)/, "Access Control"],
  [/^164\.312\(b\)/, "Audit Controls"],
  [/^164\.312\(c\)/, "Integrity"],
  [/^164\.312\(d\)/, "Authentication"],
  [/^164\.312\(e\)/, "Transmission Security"],
  [/^164\.314/, "Vendor Management"],
  [/^164\.316/, "Documentation"],
];

const FALLBACK = "HIPAA Security Rule";

export function categoryFromControls(refs: ReadonlyArray<string>): string {
  if (refs.length === 0) return FALLBACK;
  const first = refs[0];
  for (const [regex, label] of PREFIX_TO_CATEGORY) {
    if (regex.test(first)) return label;
  }
  return FALLBACK;
}
