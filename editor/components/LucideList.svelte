<script>
import { candidateUrl } from "../icons.js";

let { icons, kdeName, candidateName, busy, canAssign, onPreview, onAssign } = $props();
let lucideSearch = $state("");
let filteredLucide = $derived.by(() => {
  const terms = lucideSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return icons.filter((icon) =>
    terms.every((term) => `${icon.name} ${icon.tags.join(" ")}`.toLowerCase().includes(term)),
  );
});
</script>

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
