<script>
import { mappingIcon } from "../icons.js";

let { sourceName, mappings, palette, busy, saveVariant, previewPalette = $bindable() } = $props();
const namespace = "http://www.w3.org/2000/svg";
const shapes = "path,line,circle,ellipse,rect,polygon,polyline";
const roleNames = {
  text: "Text",
  positive: "PositiveText",
  neutral: "NeutralText",
  negative: "NegativeText",
  accent: "Accent",
  highlight: "Highlight",
};
const light = {
  viewText: "#232629",
  positive: "#27ae60",
  neutral: "#f67400",
  negative: "#da4453",
  accent: "#3daee9",
  highlight: "#3daee9",
};
const dark = {
  viewText: "#eff0f1",
  positive: "#1cdc9a",
  neutral: "#fdbc4b",
  negative: "#ff6c70",
  accent: "#3daee9",
  highlight: "#3daee9",
};
let source = $state("");
let customName = $state(null);
let selected = $state(-1);
let highlightSelection = $state(true);
let error = $state("");
let loading = $state(false);
let uses = $derived(
  Object.entries(mappings)
    .filter(([, mapping]) => mappingIcon(mapping) === sourceName)
    .map(([name]) => name),
);
let elements = $derived.by(() => {
  if (!source) return [];
  const doc = parse(source);
  return doc
    ? [...doc.querySelectorAll(shapes)].map((element, index) => ({ index, tag: element.tagName, id: element.id }))
    : [];
});
let suggestedName = $derived.by(() => {
  const doc = parse(source);
  const lucideName = sourceName.startsWith("local:")
    ? doc?.documentElement
        .getAttribute("class")
        ?.split(/\s+/)
        .find((name) => name.startsWith("lucide-"))
        ?.slice(7) || sourceName.slice(6)
    : sourceName;
  const colors = Object.entries(roleNames)
    .filter(([role, suffix]) => role !== "text" && doc?.querySelector(`.ColorScheme-${suffix}`))
    .map(([role]) => role);
  return [lucideName, ...colors]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
});
let markup = $derived.by(() => {
  const doc = parse(source);
  if (!doc) return "";
  const colors = previewPalette === "light" ? light : previewPalette === "dark" ? dark : palette || dark;
  doc.querySelector("#current-color-scheme")?.remove();
  const style = doc.createElementNS(namespace, "style");
  style.setAttribute("id", "current-color-scheme");
  style.textContent = Object.entries(roleNames)
    .map(([role, suffix]) => `.ColorScheme-${suffix} { color: ${role === "text" ? colors.viewText : colors[role]}; }`)
    .join(" ");
  doc.documentElement.prepend(style);
  doc.documentElement.classList.add("ColorScheme-Text");
  if (!doc.documentElement.style.color && !doc.documentElement.hasAttribute("color"))
    doc.documentElement.style.color = colors.viewText;
  for (const [role, suffix] of Object.entries(roleNames)) {
    for (const element of doc.querySelectorAll(`.ColorScheme-${suffix}`))
      element.style.color = role === "text" ? colors.viewText : colors[role];
  }
  [...doc.querySelectorAll(shapes)].forEach((element, index) => {
    element.setAttribute("data-shape-index", index);
    element.style.setProperty("--variant-base-stroke", paint(element, "stroke"));
    if (index === selected && highlightSelection) element.setAttribute("data-selected", "true");
  });
  return new XMLSerializer().serializeToString(doc.documentElement);
});

function parse(value) {
  if (!value) return null;
  const doc = new DOMParser().parseFromString(value, "image/svg+xml");
  return doc.querySelector("parsererror") ? null : doc;
}
function paint(element, property) {
  for (let node = element; node?.nodeType === 1; node = node.parentElement) {
    const inline = node.style?.getPropertyValue(property);
    if (inline) return inline.trim();
    if (node.hasAttribute(property)) return node.getAttribute(property).trim();
  }
  return property === "fill" ? "black" : "none";
}
function transparent(value) {
  const paint = value.trim().toLowerCase();
  return (
    paint === "none" ||
    paint === "transparent" ||
    /^#(?:[0-9a-f]{3}0|[0-9a-f]{6}00)$/.test(paint) ||
    /^(?:rgba|hsla)\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(paint) ||
    /^(?:rgb|hsl)\([^)]*\/\s*0(?:%|\.0+)?\s*\)$/.test(paint)
  );
}
function editable(doc) {
  if ([...doc.querySelectorAll("style")].some((style) => style.id !== "current-color-scheme"))
    throw new Error("This SVG uses a stylesheet; edit its paint manually before assigning theme roles.");
}
function change(mutator) {
  try {
    const doc = parse(source);
    if (!doc) throw new Error("Invalid SVG document");
    editable(doc);
    mutator(doc);
    source = new XMLSerializer().serializeToString(doc.documentElement);
    error = "";
    return true;
  } catch (cause) {
    error = cause.message;
    return false;
  }
}
function setRole(role) {
  if (!roleNames[role]) return;
  if (
    change((doc) => {
      if (selected < 0) {
        convertToThemeColor(doc, role);
        return;
      }
      const element = [...doc.querySelectorAll(shapes)][selected];
      if (!element) throw new Error("Select a shape first");
      const stroke = paint(element, "stroke");
      if (transparent(stroke)) throw new Error("This shape has no visible stroke to recolor.");
      element.style.removeProperty("stroke");
      element.style.removeProperty("color");
      element.removeAttribute("color");
      element.setAttribute("stroke", "currentColor");
      for (const suffix of Object.values(roleNames)) element.classList.remove(`ColorScheme-${suffix}`);
      element.classList.add(`ColorScheme-${roleNames[role]}`);
    })
  )
    highlightSelection = false;
}
function convertToThemeColor(doc, role) {
  for (const element of [doc.documentElement, ...doc.querySelectorAll("*")]) {
    if (element.tagName === "style") continue;
    element.style?.removeProperty("color");
    element.removeAttribute("color");
    for (const suffix of Object.values(roleNames)) element.classList.remove(`ColorScheme-${suffix}`);
    for (const property of ["stroke", "fill"]) {
      const inline = element.style?.getPropertyValue(property);
      const value = inline || element.getAttribute(property);
      if (value && !transparent(value) && !["currentcolor", "inherit"].includes(value.trim().toLowerCase())) {
        if (/url\(/i.test(value)) throw new Error(`Cannot convert ${property} using a paint server; edit it manually.`);
        if (inline) element.style.setProperty(property, "currentColor");
        else element.setAttribute(property, "currentColor");
      }
    }
  }
  for (const element of doc.querySelectorAll(shapes)) {
    if (paint(element, "fill") === "black" && !element.hasAttribute("fill"))
      element.setAttribute("fill", "currentColor");
  }
  doc.documentElement.classList.add(`ColorScheme-${roleNames[role]}`);
}
function useThemeColor() {
  change((doc) => convertToThemeColor(doc, "text"));
}
async function save(mode) {
  try {
    error = "";
    if (!source) throw new Error("Select a source first");
    const name = mode === "update" ? sourceName.slice(6) : (customName ?? suggestedName).trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))
      throw new Error("Use lowercase letters, numbers, and hyphens for the variant name");
    await saveVariant({ name, source, mode });
  } catch (cause) {
    error = cause.message;
  }
}

$effect(() => {
  const name = sourceName;
  source = "";
  selected = -1;
  highlightSelection = true;
  error = "";
  customName = null;
  if (!name) return;
  let active = true;
  loading = true;
  fetch(`/api/raw-source?name=${encodeURIComponent(name)}`)
    .then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      return body.source;
    })
    .then((value) => {
      if (active) source = value;
    })
    .catch((cause) => {
      if (active) error = cause.message;
    })
    .finally(() => {
      if (active) loading = false;
    });
  return () => {
    active = false;
  };
});
</script>

<section class="variant-editor" aria-label="SVG variant editor">
  <div class="lucide-head">
    <h3>SVG variant</h3>
    <span class="muted">{sourceName || "Choose a source"}</span>
  </div>
  {#if sourceName?.startsWith("local:") && uses.length}
    <p class="variant-uses">Used by {uses.join(", ")}. Saving updates every use.</p>
  {/if}
  {#if loading}
    <p class="muted variant-uses">Loading SVG…</p>
  {/if}
  {#if source}
    <div class="variant-controls variant-toolbar">
      <label class="field"
        >Preview palette
        <select bind:value={previewPalette}>
          <option value="current">Current</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label class="field variant-role"
        >{selected < 0 ? "Whole icon" : "Selected stroke"}
        <select
          disabled={busy}
          onchange={(event) => {
            setRole(event.currentTarget.value);
            event.currentTarget.value = "";
          }}
        >
          <option value="">Choose role…</option>
          {#each Object.keys(roleNames) as role}
            <option value={role}>{role[0].toUpperCase() + role.slice(1)}</option>
          {/each}
        </select>
      </label>
      <button type="button" disabled={busy} onclick={useThemeColor}>Use theme color</button>
    </div>
    <div class="variant-workspace">
      <button
        type="button"
        class="variant-canvas"
        aria-label="Select a shape from the SVG preview"
        onclick={(event) => {
          const shape = event.target.closest?.("[data-shape-index]");
          if (shape) {
            selected = Number(shape.getAttribute("data-shape-index"));
            highlightSelection = true;
          } else {
            selected = -1;
          }
        }}
      >
        {@html markup}
      </button>
      <div class="variant-elements">
        <span class="eyebrow">Shapes</span>
        <button type="button" class:selected={selected < 0} aria-pressed={selected < 0} onclick={() => (selected = -1)}>
          Whole icon
        </button>
        {#each elements as element (element.index)}
          <button
            type="button"
            class:selected={selected === element.index}
            aria-pressed={selected === element.index}
            onclick={() => {
              selected = element.index;
              highlightSelection = true;
            }}
          >
            {element.index + 1}. {element.tag}{element.id ? ` #${element.id}` : ""}
          </button>
        {/each}
      </div>
    </div>
    <div class="variant-controls variant-save">
      <label class="field grow"
        >Variant name<input
          value={customName ?? suggestedName}
          oninput={(event) => (customName = event.currentTarget.value)}
          disabled={busy}
        ></label
      >
      <button type="button" disabled={busy} onclick={() => save("create")}>Save as variant</button>
      {#if sourceName.startsWith("local:")}
        <button type="button" class="primary" disabled={busy} onclick={() => save("update")}>Save variant</button>
      {/if}
    </div>
  {/if}
  {#if error}
    <p class="variant-error" role="alert">{error}</p>
  {/if}
</section>
