<script>
import { candidateUrl } from "../icons.js";

let { icons, local, kdeName, candidateName, busy, canAssign, revision, onPreview, onAssign } = $props();
let lucideSearch = $state("");
let filteredLucide = $derived.by(() => {
  const terms = lucideSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return icons.filter((icon) =>
    terms.every((term) => `${icon.name} ${icon.tags.join(" ")}`.toLowerCase().includes(term)),
  );
});
</script>

<div class="lucide-head">
  <h3>Local variants</h3>
  <span class="muted">{local.length} icons</span>
</div>
{#if local.length}
  <ul class="local-list" aria-label="Local variants">
    {#each local as name (name)}
      <li class="lucide-cell">
        <button
          type="button"
          class="lucide-item"
          class:selected={candidateName === name}
          aria-pressed={candidateName === name}
          onclick={() => onPreview(name)}
        >
          <img src={candidateUrl(name, "current", false, 1, revision)} alt=""><span>{name.slice(6)}</span>
        </button>
        <button
          type="button"
          class="lucide-assign"
          disabled={busy || !canAssign(name)}
          aria-label={`Assign ${name} to ${kdeName || "selected KDE icon"}`}
          onclick={() => onAssign(name)}
        >
          Assign
        </button>
      </li>
    {/each}
  </ul>
{:else}
  <p class="muted local-empty">Add SVG files to icons/local/ or save a variant below.</p>
{/if}

<div class="lucide-head">
  <h3>Lucide icons</h3>
  <span class="muted">{filteredLucide.length} icons{filteredLucide.length > 120 ? " · first 120 shown" : ""}</span>
</div>
<label class="field lucide-search">
  <span class="sr-only">Find Lucide icon</span>
  <input type="search" placeholder="Search names and tags" autocomplete="off" bind:value={lucideSearch} disabled={busy}>
</label>
<ul class="lucide-list" aria-label="Lucide icons">
  {#each filteredLucide.slice(0, 120) as icon (icon.name)}
    <li class="lucide-cell">
      <button
        type="button"
        class:selected={candidateName === icon.name}
        class="lucide-item"
        aria-pressed={candidateName === icon.name}
        title={`${icon.name}\n${icon.tags.join(", ")}`}
        onclick={() => onPreview(icon.name)}
      >
        <img src={candidateUrl(icon.name, "current")} alt="" loading="lazy"><span>{icon.name}</span>
      </button>
      <button
        type="button"
        class="lucide-assign"
        aria-label={`Assign ${icon.name} to ${kdeName || "selected KDE icon"}`}
        disabled={busy || !canAssign(icon.name)}
        onclick={() => onAssign(icon.name)}
      >
        Assign
      </button>
    </li>
  {/each}
</ul>
