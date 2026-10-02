<script>
import {
  candidateUrl,
  categoryLabel,
  mappingIcon,
  mappingMirrored,
  mappingRotation,
  mappingScale,
  sourceUrl,
} from "../icons.js";

let {
  theme,
  kdeName,
  entry,
  mapping,
  candidate = $bindable(),
  palette,
  busy,
  canAssign,
  onSave,
  revision,
  previewPalette = $bindable(),
  onEditVariant,
} = $props();
const isRtlName = (name) => /-rtl(?:-symbolic)?$/.test(name);
let size = $state(22);
let candidateImage = $derived(
  candidateUrl(candidate.name, previewPalette, candidate.mirror, candidate.scale, revision),
);
let candidateTransform = $derived(`rotate(${candidate.rotate}deg)`);
let assigned = $derived(mappingIcon(mapping));
let preview = $derived.by(() => {
  if (previewPalette === "light") return { window: "#eff0f1", text: "#232629" };
  if (previewPalette === "dark" || !palette) return { window: "#31363b", text: "#eff0f1" };
  return { window: palette.window, text: palette.viewText };
});
</script>

<div class="pane-head detail-head">
  <div>
    <h2 id="detail-heading">{kdeName || "Select a KDE icon"}</h2>
    <span class="muted"
      >{entry
        ? `From ${entry.source} · ${entry.categories.map(categoryLabel).join(", ")}`
        : kdeName
          ? "Manual name"
          : ""}</span
    >
  </div>
  <span class="mapping-label">{assigned ? "Assigned" : ""}</span>
</div>
<div class="preview-toolbar">
  <fieldset class="segmented" aria-label="Preview palette">
    {#each ["current", "light", "dark"] as palette}
      <button type="button" class:selected={previewPalette === palette} onclick={() => (previewPalette = palette)}>
        {palette[0].toUpperCase() + palette.slice(1)}
      </button>
    {/each}
  </fieldset>
  <label class="size-control"
    >Size
    <select bind:value={size}>
      <option value={16}>16 px</option>
      <option value={22}>22 px</option>
      <option value={24}>24 px</option>
    </select>
  </label>
</div>
<div class="preview-surface" style:--preview-window={preview.window} style:--preview-text={preview.text}>
  <div class="comparison">
    <div class="preview-block">
      <span class="eyebrow">Original</span>
      <div class="icon-stage">
        {#if entry}
          <img src={sourceUrl(theme, kdeName, size, previewPalette)} width={size} height={size} alt="">
        {:else}
          <span class="muted">—</span>
        {/if}
      </div>
    </div>
    <div class="preview-arrow" aria-hidden="true">→</div>
    <div class="preview-block">
      <span class="eyebrow">Assigned</span>
      <div class="icon-stage">
        {#if assigned}
          <img
            src={candidateUrl(assigned, previewPalette, mappingMirrored(mapping), mappingScale(mapping), revision)}
            width={size}
            height={size}
            style:transform={`rotate(${mappingRotation(mapping)}deg)`}
            alt=""
          >
        {:else}
          <span class="muted">—</span>
        {/if}
      </div>
    </div>
    <div class="preview-arrow" aria-hidden="true">→</div>
    <div class="preview-block">
      <span class="eyebrow">Candidate</span>
      <div class="icon-stage">
        {#if candidate.name}
          <img src={candidateImage} width={size} height={size} style:transform={candidateTransform} alt="">
        {:else}
          <span class="muted">—</span>
        {/if}
      </div>
    </div>
  </div>
  <div class="assignment">
    <div><span class="eyebrow">Assignment</span><strong>{assigned || "—"}</strong></div>
    <div class="assignment-actions">
      <button type="button" disabled={busy || !candidate.name} onclick={onEditVariant}>Edit SVG variant</button>
      <fieldset class="rotate-stepper" aria-label="Rotate icon">
        <button
          type="button"
          aria-label="Rotate counterclockwise 22.5 degrees"
          title="Rotate counterclockwise 22.5°"
          disabled={busy || !candidate.name}
          onclick={() => (candidate.rotate = (candidate.rotate + 337.5) % 360)}
        >
          ↶
        </button>
        <output aria-live="polite">{candidate.rotate}°</output>
        <button
          type="button"
          aria-label="Rotate clockwise 22.5 degrees"
          title="Rotate clockwise 22.5°"
          disabled={busy || !candidate.name}
          onclick={() => (candidate.rotate = (candidate.rotate + 22.5) % 360)}
        >
          ↷
        </button>
      </fieldset>
      {#if isRtlName(kdeName)}
        <button
          type="button"
          aria-label="Mirror horizontally"
          aria-pressed={candidate.mirror}
          disabled={busy || !candidate.name}
          onclick={() => (candidate.mirror = !candidate.mirror)}
        >
          Mirror
        </button>
      {/if}
      {#if assigned}
        <button type="button" disabled={busy} onclick={() => onSave(null)}>Remove</button>
      {/if}
      <button type="button" class="primary" disabled={busy || !canAssign} onclick={() => onSave(candidate.name)}>
        Assign
      </button>
    </div>
  </div>
</div>
