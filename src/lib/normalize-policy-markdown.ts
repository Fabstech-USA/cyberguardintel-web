/**
 * Normalize AI-generated or legacy policy markdown so parsers (TipTap, react-markdown)
 * receive valid ATX headings, paragraph breaks, and list lines.
 */
export function normalizePolicyMarkdown(raw: string): string {
  if (!raw?.trim()) return "";

  let text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  text = fixLegacyMetadataFence(text);
  text = reorderTitleBeforeMetadata(text);
  text = tightenSectionSpacing(text);

  // Insert breaks before inline headings jammed into prior text: "...rules.## Purpose"
  text = text.replace(/([^\n#])(#{1,6})(\s*)/g, (_, before, hashes, space) => {
    if (before === "\n") return `${before}${hashes}${space}`;
    return `${before}\n\n${hashes}${space}`;
  });

  // Space after heading markers when missing: ##Purpose -> ## Purpose
  text = text.replace(/^(#{1,6})([^\s#\n].*)$/gm, (_, hashes, rest) => {
    return `${hashes} ${rest.trim()}`;
  });

  // Split heading title from run-on body on same line: ## PurposeThis org -> ## Purpose + body
  text = text.replace(
    /^(#{1,6} [^\n]+?)([a-z])([A-Z][a-z])/gm,
    "$1$2\n\n$3"
  );

  // Blank line before headings (except start of document)
  text = text.replace(/([^\n])\n(#{1,6} )/g, "$1\n\n$2");

  // Blank line after headings when followed by body (not another heading or list)
  text = text.replace(
    /^(#{1,6} .+)\n(?!\n)(?![#*-])(\S)/gm,
    "$1\n\n$2"
  );

  // List items run into prior sentence: "...rules.- Item" -> paragraph break + list
  text = text.replace(/([.!?:])\s*-\s+/g, "$1\n\n- ");
  text = text.replace(/([.!?])\n- /g, "$1\n\n- ");

  // Collapse excessive blank lines
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/** Legacy AI output used `---` fences; markdown parsers treat trailing `---` as setext h2 (all bold). */
function fixLegacyMetadataFence(text: string): string {
  const match = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) return text;

  const body = match[1].trim();
  if (!/^POLICY ID:/m.test(body)) return text;

  const lines = body.split("\n").map((line) => {
    const colon = line.indexOf(":");
    if (colon <= 0) return `- ${line.trim()}`;
    const label = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    const prettyLabel = label
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
    return `- **${prettyLabel}:** ${value}`;
  });

  const rest = text.slice(match[0].length).trimStart();
  return `## Policy metadata\n\n${lines.join("\n")}\n\n${rest}`.trim();
}

/** Title should lead the document; metadata follows immediately after. */
function reorderTitleBeforeMetadata(text: string): string {
  const titleMatch = text.match(/^# .+$/m);
  const metaMatch = text.match(
    /^## Policy metadata\n([\s\S]*?)(?=\n## |\n# |$)/m
  );
  if (!titleMatch || !metaMatch || titleMatch.index === undefined) {
    return text;
  }
  if (metaMatch.index === undefined || titleMatch.index < metaMatch.index) {
    return text;
  }

  const title = titleMatch[0].trim();
  const meta = metaMatch[0].trim();
  let remainder = text.replace(meta, "").replace(title, "");
  remainder = remainder.replace(/\n{3,}/g, "\n\n").trim();

  return `${title}\n\n${meta}\n\n${remainder}`.trim();
}

/** Collapse run-on blank lines inside section bodies (common in AI attestation blocks). */
function tightenSectionSpacing(text: string): string {
  return text
    .split(/\n(?=## )/)
    .map((section) => section.replace(/\n{3,}/g, "\n\n"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}
