<script>
  import { categoryLabel, mappingIcon, mappingMirrored, mappingScale, mappingRotation, sourceUrl, candidateUrl } from "../icons.js";

  let { theme, kdeName, entry, mapping, candidate = $bindable(), palette, busy, canAssign, onSave } = $props();
  const isRtlName = (name) => /-rtl(?:-symbolic)?$/.test(name);
  let previewPalette = $state("current");
  let size = $state(22);
  let assigned = $derived(mappingIcon(mapping));
  let preview = $derived.by(() => {
    if (previewPalette === "light") return { window: "#eff0f1", view: "#fcfcfc", text: "#232629" };
    if (previewPalette === "dark" || !palette) return { window: "#31363b", view: "#232629", text: "#eff0f1" };
    return { window: palette.window, view: palette.view, text: palette.viewText };
  });
</script>

<div class="pane-head detail-head">
  <div>
    <h2 id="detail-heading">{kdeName || "Select a KDE icon"}</h2>
    <span class="muted">{entry ? `From ${entry.source} · ${entry.categories.map(categoryLabel).join(", ")}` : kdeName ? "Manual name" : ""}</span>
  </div>
  <span class="mapping-label">{assigned ? "Assigned" : ""}</span>
</div>
<div class="preview-toolbar">
  <div class="segmented" role="group" aria-label="Preview palette">
    {#each ["current", "light", "dark"] as palette}
      <button type="button" class:selected={previewPalette === palette} onclick={() => previewPalette = palette}>{palette[0].toUpperCase() + palette.slice(1)}</button>
    {/each}
  </div>
  <label class="size-control">Size
    <select bind:value={size}>
      <option value={16}>16 px</option><option value={22}>22 px</option><option value={24}>24 px</option>
    </select>
  </label>
</div>
<div class="preview-surface" style:--preview-window={preview.window} style:--preview-view={preview.view} style:--preview-text={preview.text}>
  <div class="comparison">
    <div class="preview-block">
      <span class="eyebrow">Original</span>
      <div class="icon-stage">
        {#if entry}<img src={sourceUrl(theme, kdeName, size, previewPalette)} width={size} height={size} alt="">{:else}<span class="muted">—</span>{/if}
      </div>
    </div>
    <div class="preview-arrow" aria-hidden="true">→</div>
    <div class="preview-block">
      <span class="eyebrow">Assigned</span>
      <div class="icon-stage">
        {#if assigned}
          <img src={candidateUrl(assigned, previewPalette, mappingMirrored(mapping), mappingScale(mapping))} width={size} height={size} style:transform={`rotate(${mappingRotation(mapping)}deg)`} alt="">
        {:else}<span class="muted">—</span>{/if}
      </div>
    </div>
    <div class="preview-arrow" aria-hidden="true">→</div>
    <div class="preview-block">
      <span class="eyebrow">Candidate</span>
      <div class="icon-stage">
        {#if candidate.name}
          <img src={candidateUrl(candidate.name, previewPalette, candidate.mirror, candidate.scale)} width={size} height={size} style:transform={`rotate(${candidate.rotate}deg)`} alt="">
        {:else}<span class="muted">—</span>{/if}
      </div>
    </div>
  </div>
  <div class="context-previews">
    <div class="context-block">
      <span class="eyebrow">Tray</span>
      <div class="tray">
        <span class="tray-dots" aria-hidden="true">⌃</span>
        {#if candidate.name}
          <img class="context-icon" src={candidateUrl(candidate.name, previewPalette, candidate.mirror, candidate.scale)} width={size} height={size} style:transform={`rotate(${candidate.rotate}deg)`} alt="">
        {/if}
        <span class="tray-clock">12:34</span>
      </div>
    </div>
    <div class="context-block">
      <span class="eyebrow">Notification</span>
      <div class="notification">
        {#if candidate.name}
          <img class="context-icon" src={candidateUrl(candidate.name, previewPalette, candidate.mirror, candidate.scale)} width={size} height={size} style:transform={`rotate(${candidate.rotate}deg)`} alt="">
        {/if}
        <div><strong>Notification</strong><span>Preview</span></div>
        <span class="notification-time">now</span>
      </div>
    </div>
  </div>
  <div class="assignment">
    <div><span class="eyebrow">Assignment</span><strong>{assigned || "—"}</strong></div>
    <div class="assignment-actions">
      <div class="rotate-stepper" role="group" aria-label="Rotate icon">
        <button type="button" aria-label="Rotate counterclockwise 22.5 degrees" title="Rotate counterclockwise 22.5°" disabled={busy || !candidate.name} onclick={() => candidate.rotate = (candidate.rotate + 337.5) % 360}>↶</button>
        <output aria-live="polite">{candidate.rotate}°</output>
        <button type="button" aria-label="Rotate clockwise 22.5 degrees" title="Rotate clockwise 22.5°" disabled={busy || !candidate.name} onclick={() => candidate.rotate = (candidate.rotate + 22.5) % 360}>↷</button>
      </div>
      {#if isRtlName(kdeName)}
        <button type="button" aria-label="Mirror horizontally" aria-pressed={candidate.mirror} disabled={busy || !candidate.name} onclick={() => candidate.mirror = !candidate.mirror}>Mirror</button>
      {/if}
      {#if assigned}<button type="button" disabled={busy} onclick={() => onSave(null)}>Remove</button>{/if}
      <button type="button" class="primary" disabled={busy || !canAssign} onclick={() => onSave(candidate.name)}>Assign</button>
    </div>
  </div>
</div>
