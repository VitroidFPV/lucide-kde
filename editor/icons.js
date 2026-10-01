export const categoryLabel = (category) => category === "mimetypes" ? "MIME types" : category[0].toUpperCase() + category.slice(1);
export const mappingIcon = (mapping) => typeof mapping === "string" ? mapping : mapping?.icon || "";
export const mappingMirrored = (mapping) => typeof mapping === "object" && mapping?.mirror === true;
export const mappingScale = (mapping) => typeof mapping === "object" && mapping?.scale || 1;
export const mappingRotation = (mapping) => typeof mapping === "object" && mapping?.rotate || 0;

export function sourceUrl(theme, name, size = 22, palette = "current") {
  return `/api/source?theme=${encodeURIComponent(theme)}&name=${encodeURIComponent(name)}&size=${size}&palette=${palette}`;
}

export function candidateUrl(name, palette = "current", mirror = false, scale = 1) {
  return `/api/candidate?name=${encodeURIComponent(name)}&palette=${palette}${mirror ? "&mirror=1" : ""}${scale !== 1 ? `&scale=${scale}` : ""}`;
}
