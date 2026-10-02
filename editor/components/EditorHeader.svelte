<script>
let { needsBuild, busy, archivePath, iconCount, onBuild, onApply } = $props();
</script>

<header class="topbar">
  <div class="brand">
    <h1>Lucide KDE</h1>
    <span class="brand-sub">Editor</span>
    <span class="header-count">{iconCount} names</span>
  </div>
  <div class="top-actions">
    {#if !needsBuild && archivePath}
      <span class="archive-path" title={archivePath}>{archivePath}</span>
    {/if}
    <span class="build-state" aria-live="polite">{needsBuild ? "Unbuilt changes" : "Archive ready"}</span>
    <button type="button" disabled={busy} onclick={onBuild}>Build Archive</button>
    {#if !needsBuild}
      <a class="button" href="/download">Download</a>
    {/if}
    <button class="primary" type="button" disabled={busy} onclick={onApply}>Apply to Plasma</button>
  </div>
</header>
