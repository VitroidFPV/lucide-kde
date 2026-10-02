<script>
import { candidateUrl } from "../icons.js";

let {
  icons,
  local,
  kdeName,
  candidateName,
  busy,
  canAssign,
  revision,
  onPreview,
  onAssign,
  activeSource = $bindable("lucide"),
} = $props();
let search = $state("");
let filteredLucide = $derived.by(() => {
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return icons.filter((icon) =>
    terms.every((term) => `${icon.name} ${icon.tags.join(" ")}`.toLowerCase().includes(term)),
  );
});
let filteredLocal = $derived(local.filter((name) => name.slice(6).toLowerCase().includes(search.trim().toLowerCase())));
</script>

<div class="lucide-head">
  <fieldset class="segmented" aria-label="Icon source">
    <button
      type="button"
      class:selected={activeSource === "lucide"}
      aria-pressed={activeSource === "lucide"}
      onclick={() => {
        activeSource = "lucide";
        search = "";
      }}
    >
      Lucide
    </button>
    <button
      type="button"
      class:selected={activeSource === "local"}
      aria-pressed={activeSource === "local"}
      onclick={() => {
        activeSource = "local";
        search = "";
      }}
    >
      Local variants
    </button>
  </fieldset>
  <span class="muted">
    {activeSource === "lucide"
      ? `${filteredLucide.length} icons${filteredLucide.length > 120 ? " · first 120 shown" : ""}`
      : `${filteredLocal.length} icons`}
  </span>
</div>
<label class="field lucide-search">
  <span class="sr-only">Find {activeSource === "lucide" ? "Lucide icon" : "local variant"}</span>
  <input
    type="search"
    placeholder={activeSource === "lucide" ? "Search names and tags" : "Search local variants"}
    autocomplete="off"
    bind:value={search}
    disabled={busy}
  >
</label>
{#if activeSource === "local" && !local.length}
  <p class="muted local-empty">Add SVG files to icons/local/ or save a variant below.</p>
{:else}
  <ul class="lucide-list" aria-label={activeSource === "lucide" ? "Lucide icons" : "Local variants"}>
    {#if activeSource === "lucide"}
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
    {:else}
      {#each filteredLocal as name (name)}
        <li class="lucide-cell">
          <button
            type="button"
            class="lucide-item"
            class:selected={candidateName === name}
            aria-pressed={candidateName === name}
            onclick={() => onPreview(name)}
          >
            <img src={candidateUrl(name, "current", false, 1, revision)} alt="" loading="lazy">
            <span>{name.slice(6)}</span>
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
    {/if}
  </ul>
{/if}
