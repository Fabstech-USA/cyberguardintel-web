/**
 * Normalize AI-generated or legacy policy markdown so parsers (TipTap, react-markdown)
 * receive valid ATX headings, paragraph breaks, and list lines.
 */
export function normalizePolicyMarkdown(raw: string): string {
  if (!raw?.trim()) return "";

  let text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

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
