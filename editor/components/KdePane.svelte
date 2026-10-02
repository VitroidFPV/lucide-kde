<script>
import { tick } from "svelte";
import { categoryLabel, sourceUrl } from "../icons.js";
import { searchKdeNames } from "../search.js";

let { themes, icons, mappings, theme, kdeName, busy, loading, onThemeChange, onSelect, onNotice } = $props();
const validKdeName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
let kdeSearch = $state("");
let kdeCategory = $state("all");
let kdeFilter = $state("all");
let manualName = $state("");
let visibleKdeCount = $state(200);
let kdeList;

let entries = $derived.by(() => {
  const all = [...icons];
  const known = new Set(all.map((entry) => entry.name));
  for (const name of [...Object.keys(mappings), kdeName]) {
    if (name && !known.has(name)) {
      all.push({ name, source: "Manual", categories: ["manual"] });
      known.add(name);
    }
  }
  const base = (name) => name.replace(/-(symbolic|rtl)$/, "");
  return all.sort((a, b) => base(a.name).localeCompare(base(b.name)) || a.name.localeCompare(b.name));
});
let categories = $derived([...new Set(entries.flatMap((entry) => entry.categories))].sort());
let filteredKde = $derived(
  searchKdeNames(
    entries.filter(
      (entry) =>
        (kdeCategory === "all" || entry.categories.includes(kdeCategory)) &&
        (kdeFilter === "all" || Object.hasOwn(mappings, entry.name) === (kdeFilter === "assigned")),
    ),
    kdeSearch.trim().toLowerCase(),
    mappings,
  ),
);

$effect(() => {
  if (loading) {
    kdeCategory = "all";
    visibleKdeCount = 200;
  }
});

export async function revealSelection(focus = false) {
  await tick();
  const selected = kdeList?.querySelector(".selected");
  selected?.scrollIntoView({ block: "center" });
  if (focus) selected?.focus({ preventScroll: true });
}

function openManual(event) {
  event.preventDefault();
  const name = manualName.trim();
  if (!validKdeName.test(name)) {
    onNotice("Use letters, numbers, dots, underscores, and hyphens", true);
    return;
  }
  kdeSearch = name;
  kdeCategory = "all";
  kdeFilter = "all";
  visibleKdeCount = 200;
  onSelect(name);
  onNotice("");
}

function handleKeydown(event) {
  if (
    !event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    !["ArrowUp", "ArrowDown"].includes(event.key)
  )
    return;
  if (event.target instanceof HTMLSelectElement || !filteredKde.length) return;
  event.preventDefault();
  const names = filteredKde.map((entry) => entry.name);
  const direction = event.key === "ArrowDown" ? 1 : -1;
  const index = names.indexOf(kdeName);
  const next = index < 0 ? (direction === 1 ? 0 : names.length - 1) : index + direction;
  if (next < 0 || next >= names.length) return;
  if (next >= visibleKdeCount) visibleKdeCount = Math.ceil((next + 1) / 200) * 200;
  const focusList = event.target instanceof Element && !!event.target.closest(".kde-list, .lucide-list");
  onSelect(names[next], focusList);
}
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="pane names-pane" aria-labelledby="names-heading">
  <h2 id="names-heading" class="sr-only">KDE icons</h2>
  <div class="toolbar">
    <label class="field grow">
      <span>Source theme</span>
      <select value={theme} disabled={busy} onchange={(event) => onThemeChange(event.currentTarget.value)}>
        {#each themes as theme (theme.id)}
          <option value={theme.id}>{theme.label}</option>
        {/each}
      </select>
    </label>
    <label class="field category-field">
      <span>Category</span>
      <select bind:value={kdeCategory} disabled={busy} onchange={() => (visibleKdeCount = 200)}>
        <option value="all">All categories</option>
        {#each categories as category}
          <option value={category}>{categoryLabel(category)}</option>
        {/each}
      </select>
    </label>
  </div>
  <div class="toolbar">
    <label class="field grow">
      <span>Find KDE name</span>
      <input
        type="search"
        placeholder="Search icon names"
        autocomplete="off"
        bind:value={kdeSearch}
        disabled={busy}
        oninput={() => (visibleKdeCount = 200)}
      >
    </label>
    <label class="field filter-field">
      <span>Show</span>
      <select bind:value={kdeFilter} disabled={busy} onchange={() => (visibleKdeCount = 200)}>
        <option value="all">All</option>
        <option value="assigned">Assigned</option>
        <option value="unassigned">Unassigned</option>
      </select>
    </label>
  </div>
  <form class="manual-row" onsubmit={openManual}>
    <label class="field grow">
      <span>Manual name</span>
      <input
        type="text"
        placeholder="audio-volume-high"
        pattern="[A-Za-z0-9][A-Za-z0-9._-]*"
        autocomplete="off"
        bind:value={manualName}
        disabled={busy}
      >
    </label>
    <button type="submit" disabled={busy}>Open</button>
  </form>
  <div class="kde-list" role="listbox" aria-label="KDE icon names" bind:this={kdeList}>
    {#if loading}
      Loading…
    {/if}
    {#each filteredKde.slice(0, visibleKdeCount) as entry (entry.name)}
      <button
        type="button"
        class:selected={kdeName === entry.name}
        class="kde-row"
        role="option"
        aria-selected={kdeName === entry.name}
        onclick={() => onSelect(entry.name, true)}
      >
        <span class="kde-thumbnail">
          {#if !entry.categories.includes("manual")}
            <img
              src={sourceUrl(theme, entry.name, 22, "current")}
              alt=""
              loading="lazy"
              decoding="async"
              onerror={(event) => (event.currentTarget.hidden = true)}
            >
          {/if}
        </span>
        <span class="name">{entry.name}</span><span class="source">{entry.source}</span>
        {#if Object.hasOwn(mappings, entry.name)}
          <span class="mapped-dot" title="Assigned"></span>
        {/if}
      </button>
    {/each}
  </div>
  {#if filteredKde.length > visibleKdeCount}
    <button class="kde-more" type="button" onclick={() => (visibleKdeCount += 200)}>Show more</button>
  {/if}
</section>
