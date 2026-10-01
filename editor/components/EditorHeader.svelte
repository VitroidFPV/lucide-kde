<script>
  let { needsBuild, busy, onBuild, onApply } = $props();
</script>

<header class="topbar">
  <div class="brand"><h1>Lucide KDE</h1><span class="brand-sub">Editor</span></div>
  <div class="top-actions">
    <span class="build-state" aria-live="polite">{needsBuild ? "Unbuilt changes" : "Archive ready"}</span>
    <button type="button" disabled={busy} onclick={onBuild}>Build Archive</button>
    {#if !needsBuild}<a class="button" href="/download">Download</a>{/if}
    <button class="primary" type="button" disabled={busy} onclick={onApply}>Apply to Plasma</button>
  </div>
</header>
