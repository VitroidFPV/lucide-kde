export const roles = {
  text: ["Text", "#232629"],
  positive: ["PositiveText", "#27ae60"],
  neutral: ["NeutralText", "#f67400"],
  negative: ["NegativeText", "#da4453"],
  accent: ["Accent", "#3daee9"],
  highlight: ["Highlight", "#3daee9"],
} as const;

export const shapeNames = ["path", "line", "circle", "ellipse", "rect", "polygon", "polyline"];

export function validateSvg(source: string): void {
  if (source.length > 1_000_000) throw new Error("SVG exceeds 1 MB");
  const markup = source.replace(/<!--[\s\S]*?-->/g, "").replace(/^\s*<\?xml\s[^?]*\?>/i, "");
  if (/<!|<\?|<\s*(?:script|foreignObject|iframe|image)\b/i.test(markup))
    throw new Error("SVG contains unsupported active or external content");
  if (/\bon[a-z]+\s*=|\b(?:href|xlink:href)\s*=\s*['"](?!#)|@import\b|url\(\s*(?!['"]?#)/i.test(markup))
    throw new Error("SVG contains an event handler or external reference");
  const stack: string[] = [];
  let position = 0;
  let roots = 0;
  while (position < markup.length) {
    const start = markup.indexOf("<", position);
    if (start < 0) {
      if (!stack.length && markup.slice(position).trim()) throw new Error("Text outside SVG root");
      break;
    }
    if (!stack.length && markup.slice(position, start).trim()) throw new Error("Text outside SVG root");
    let end = start + 1;
    let quote = "";
    for (; end < markup.length; end++) {
      const char = markup[end];
      if (quote) {
        if (char === quote) quote = "";
      } else if (char === "'" || char === '"') quote = char;
      else if (char === ">") break;
    }
    if (end === markup.length || quote) throw new Error("Unclosed SVG tag or attribute");
    const tag = markup.slice(start, end + 1);
    const match = tag.match(/^<(\/?)\s*([A-Za-z][\w:.-]*)/);
    if (!match) throw new Error("Invalid SVG tag");
    const name = match[2];
    const closing = !!match[1];
    const selfClosing = /\/\s*>$/.test(tag);
    let attributes = tag.slice(match[0].length, tag.length - (selfClosing ? 2 : 1));
    if (closing) {
      if (attributes.trim() || stack.pop() !== name) throw new Error("SVG tags are not balanced");
    } else {
      if (!stack.length) {
        if (name !== "svg" || roots++) throw new Error("Expected one SVG root element");
      }
      const seen = new Set<string>();
      while (attributes.trim()) {
        const attribute = attributes.match(/^\s+([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/);
        if (!attribute || seen.has(attribute[1])) throw new Error(`Invalid SVG attribute on ${name}`);
        seen.add(attribute[1]);
        attributes = attributes.slice(attribute[0].length);
      }
      if (!selfClosing) stack.push(name);
    }
    position = end + 1;
  }
  if (stack.length || roots !== 1) throw new Error("Expected a complete standalone SVG document");
}

export function paletteStyles(colors: Record<keyof typeof roles, string>): string {
  return Object.entries(roles)
    .map(([key, [suffix]]) => `.ColorScheme-${suffix} { color: ${colors[key as keyof typeof roles]}; }`)
    .join(" ");
}

function openingTag(source: string): string {
  const start = source.search(/<svg\b/i);
  if (start < 0) throw new Error("SVG has no root element");
  let quote = "";
  for (let index = start; index < source.length; index++) {
    const char = source[index];
    if (quote) {
      if (char === quote) quote = "";
    } else if (char === "'" || char === '"') quote = char;
    else if (char === ">") return source.slice(start, index + 1);
  }
  throw new Error("Unclosed SVG root tag");
}

export function themedSvg(source: string, mirror = false, scale = 1, rotate = 0, legacyLucide = false): string {
  validateSvg(source);
  const opening = openingTag(source);
  const viewBox = opening
    .match(/\bviewBox\s*=\s*['"]([^'"]+)['"]/i)?.[1]
    .split(/[\s,]+/)
    .map(Number);
  const width = Number(opening.match(/\bwidth\s*=\s*['"]([\d.]+)(?:px)?['"]/i)?.[1]);
  const height = Number(opening.match(/\bheight\s*=\s*['"]([\d.]+)(?:px)?['"]/i)?.[1]);
  const box = viewBox ?? (width > 0 && height > 0 ? [0, 0, width, height] : undefined);
  if (!Number.isFinite(scale) || scale <= 0 || scale > 1) throw new Error("Invalid icon scale");
  if (!Number.isInteger(rotate / 22.5) || rotate < 0 || rotate >= 360) throw new Error("Invalid icon rotation");
  if (
    (mirror || scale !== 1 || rotate !== 0) &&
    (box?.length !== 4 || !box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0)
  )
    throw new Error("SVG needs a valid viewBox or numeric width and height to transform");
  const transforms: string[] = [];
  if (rotate && box) transforms.push(`rotate(${rotate} ${box[0] + box[2] / 2} ${box[1] + box[3] / 2})`);
  if (scale !== 1 && box)
    transforms.push(
      `translate(${(1 - scale) * (box[0] + box[2] / 2)} ${(1 - scale) * (box[1] + box[3] / 2)}) scale(${scale})`,
    );
  if (mirror && box) transforms.push(`translate(${2 * box[0] + box[2]} 0) scale(-1 1)`);
  const fallback = Object.fromEntries(Object.entries(roles).map(([key, [, color]]) => [key, color])) as Record<
    keyof typeof roles,
    string
  >;
  const style = `<style id="current-color-scheme" type="text/css">${paletteStyles(fallback)}</style>`;
  const cleaned = source.replace(/<style\b[^>]*\bid=['"]current-color-scheme['"][^>]*>[\s\S]*?<\/style>/i, "");
  const root = openingTag(cleaned);
  const content = cleaned.slice(cleaned.indexOf(root) + root.length).replace(/<\/svg>\s*$/i, "");
  const transform = transforms.length ? ` transform="${transforms.join(" ")}"` : "";
  const rootPaint = ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"]
    .map((name) => root.match(new RegExp(`\\s${name}=(['"])[^]*?\\1`, "i"))?.[0]?.trim())
    .filter(Boolean)
    .join(" ");
  const groupPaint = rootPaint ? ` ${rootPaint}` : "";
  if (legacyLucide) {
    return cleaned
      .replace(
        root,
        `${root}\n  <style id="current-color-scheme" type="text/css">\n    .ColorScheme-Text { color: #232629; }\n  </style>\n  <g class="ColorScheme-Text"${groupPaint}${transform}>`,
      )
      .replace(/<\/svg>\s*$/, "  </g>\n</svg>\n");
  }
  const rootRole =
    root
      .match(/\bclass=['"]([^'"]+)['"]/i)?.[1]
      .match(/\bColorScheme-(?:Text|PositiveText|NeutralText|NegativeText|Accent|Highlight)\b/)?.[0] ??
    "ColorScheme-Text";
  return `${cleaned.slice(0, cleaned.indexOf(root))}${root}\n${style}\n<g class="${rootRole}"${groupPaint}${transform}>${content}</g>\n</svg>\n`;
}
