<script>
  import { onMount, tick } from "svelte";
  import { searchKdeNames } from "./search.js";

  const validKdeName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  const isRtlName = (name) => /-rtl(?:-symbolic)?$/.test(name);
  const categoryLabel = (category) => category === "mimetypes" ? "MIME types" : category[0].toUpperCase() + category.slice(1);
  const mappingIcon = (mapping) => typeof mapping === "string" ? mapping : mapping?.icon || "";
  const mappingMirrored = (mapping) => typeof mapping === "object" && mapping?.mirror === true;
  const mappingScale = (mapping) => typeof mapping === "object" && mapping?.scale || 1;
  const mappingRotation = (mapping) => typeof mapping === "object" && mapping?.rotate || 0;

  let state = $state({ themes: [], icons: [], lucide: [], mappings: {}, palette: null, theme: "", kde: "", candidate: "", mirror: false, scale: 1, rotate: 0, previewPalette: "current", size: 22, needsBuild: true, busy: false, archivePath: "" });
  let kdeSearch = $state("");
  let kdeCategory = $state("all");
  let kdeFilter = $state("all");
  let lucideSearch = $state("");
  let manualName = $state("");
  let visibleKdeCount = $state(200);
  let loadingTheme = $state(false);
  let message = $state("");
  let messageError = $state(false);
  let noticeTimeout;
  let kdeList;
  let lucideList;

  let entries = $derived.by(() => {
    const all = [...state.icons];
    const known = new Set(all.map((entry) => entry.name));
    for (const name of [...Object.keys(state.mappings), state.kde]) {
      if (name && !known.has(name)) { all.push({ name, source: "Manual", categories: ["manual"] }); known.add(name); }
    }
    const base = (name) => name.replace(/-(symbolic|rtl)$/, "");
    return all.sort((a, b) => base(a.name).localeCompare(base(b.name)) || a.name.localeCompare(b.name));
  });
  let categories = $derived([...new Set(entries.flatMap((entry) => entry.categories))].sort());
  let filteredKde = $derived(searchKdeNames(entries.filter((entry) =>
    (kdeCategory === "all" || entry.categories.includes(kdeCategory))
    && (kdeFilter === "all" || Object.hasOwn(state.mappings, entry.name) === (kdeFilter === "assigned"))
  ), kdeSearch.trim().toLowerCase(), state.mappings));
  let filteredLucide = $derived.by(() => {
    const terms = lucideSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return state.lucide.filter((icon) => terms.every((term) => `${icon.name} ${icon.tags.join(" ")}`.toLowerCase().includes(term)));
  });
  let selectedEntry = $derived(state.icons.find((entry) => entry.name === state.kde));
  let assigned = $derived(mappingIcon(state.mappings[state.kde]));
  let preview = $derived.by(() => {
    if (state.previewPalette === "light") return { window: "#eff0f1", view: "#fcfcfc", text: "#232629" };
    if (state.previewPalette === "dark" || !state.palette) return { window: "#31363b", view: "#232629", text: "#eff0f1" };
    return { window: state.palette.window, view: state.palette.view, text: state.palette.viewText };
  });

  async function api(path, options) {
    const response = await fetch(path, options);
    let body;
    try { body = await response.json(); } catch { body = null; }
    if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
    return body;
  }
  function notice(value, error = false, duration = 0) {
    clearTimeout(noticeTimeout);
    message = value;
    messageError = error;
    if (duration) noticeTimeout = setTimeout(() => { message = ""; }, duration);
  }
  function applyColors(colors) {
    const variables = { window: "window", windowText: "window-text", view: "view", viewText: "view-text", button: "button", buttonText: "button-text", selection: "selection", selectionText: "selection-text" };
    for (const [key, variable] of Object.entries(variables)) document.documentElement.style.setProperty(`--${variable}`, colors[key]);
    const rgb = colors.window.match(/[0-9a-f]{2}/gi)?.map((value) => parseInt(value, 16)) || [0, 0, 0];
    document.documentElement.style.colorScheme = rgb.reduce((a, b) => a + b, 0) > 400 ? "light" : "dark";
  }
  function sourceUrl(name, size = state.size, palette = state.previewPalette) {
    return `/api/source?theme=${encodeURIComponent(state.theme)}&name=${encodeURIComponent(name)}&size=${size}&palette=${palette}`;
  }
  function candidateUrl(name, palette = state.previewPalette, mirror = false, scale = 1) {
    return `/api/candidate?name=${encodeURIComponent(name)}&palette=${palette}${mirror ? "&mirror=1" : ""}${scale !== 1 ? `&scale=${scale}` : ""}`;
  }
  function canAssign(name) {
    const mapping = state.mappings[state.kde];
    return !!state.kde && !!name && (mappingIcon(mapping) !== name || mappingMirrored(mapping) !== state.mirror || mappingRotation(mapping) !== state.rotate);
  }
  async function selectKde(name, focus = false) {
    state.kde = name;
    state.candidate = mappingIcon(state.mappings[name]);
    state.mirror = mappingMirrored(state.mappings[name]);
    state.scale = mappingScale(state.mappings[name]);
    state.rotate = mappingRotation(state.mappings[name]);
    await tick();
    const selected = kdeList?.querySelector(".selected");
    selected?.scrollIntoView({ block: "center" });
    if (focus) selected?.focus({ preventScroll: true });
  }
  async function loadTheme(id) {
    notice("");
    state.theme = id;
    kdeCategory = "all";
    visibleKdeCount = 200;
    loadingTheme = true;
    try { state.icons = await api(`/api/icons?theme=${encodeURIComponent(id)}`); }
    catch (error) { state.icons = []; notice(error.message, true); }
    finally { loadingTheme = false; }
  }
  async function saveMapping(lucideName) {
    if (!state.kde) return;
    state.busy = true;
    notice("");
    try {
      const categories = state.icons.find((icon) => icon.name === state.kde)?.categories;
      const result = await api("/api/mapping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kdeName: state.kde, lucideName, mirror: state.mirror, rotate: state.rotate, categories }) });
      state.mappings = result.mappings;
      state.needsBuild = true;
      if (lucideName === null) { state.candidate = ""; state.mirror = false; state.scale = 1; state.rotate = 0; }
      notice(lucideName ? "Assignment saved" : "Assignment removed", false, 4000);
    } catch (error) { notice(error.message, true); }
    finally { state.busy = false; }
  }
  async function execute(action) {
    state.busy = true;
    notice(action === "build" ? "Building archive…" : "Applying theme…");
    try {
      const result = await api(`/api/${action}`, { method: "POST" });
      state.needsBuild = result.needsBuild;
      state.archivePath = result.archivePath;
      if (action === "apply") {
        const updated = await api("/api/state");
        state.themes = updated.themes;
        await loadTheme(state.theme);
      }
      notice(action === "build" ? "Archive ready" : "Applied to Plasma. If an icon stays cached, change its state or reselect the theme.", false, action === "apply" ? 8000 : 4000);
    } catch (error) { notice(error.message, true); }
    finally { state.busy = false; }
  }
  function openManual(event) {
    event.preventDefault();
    const name = manualName.trim();
    if (!validKdeName.test(name)) { notice("Use letters, numbers, dots, underscores, and hyphens", true); return; }
    kdeSearch = name;
    kdeCategory = "all";
    kdeFilter = "all";
    visibleKdeCount = 200;
    selectKde(name);
    notice("");
  }
  function handleKeydown(event) {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
    if (event.target instanceof HTMLSelectElement || !filteredKde.length) return;
    event.preventDefault();
    const names = filteredKde.map((entry) => entry.name);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const index = names.indexOf(state.kde);
    const next = index < 0 ? (direction === 1 ? 0 : names.length - 1) : index + direction;
    if (next < 0 || next >= names.length) return;
    if (next >= visibleKdeCount) visibleKdeCount = Math.ceil((next + 1) / 200) * 200;
    selectKde(names[next], kdeList?.contains(event.target) || lucideList?.contains(event.target));
  }
  onMount(() => {
    (async () => {
      try {
        const [initial, lucide] = await Promise.all([api("/api/state"), api("/api/lucide")]);
        Object.assign(state, initial);
        state.lucide = lucide;
        applyColors(state.palette);
        await loadTheme(initial.defaultTheme);
        const first = state.icons.find((icon) => state.mappings[icon.name]) || state.icons.find((icon) => icon.name === "audio-volume-high") || state.icons[0];
        if (first) selectKde(first.name);
      } catch (error) { notice(error.message, true); }
    })();
    return () => clearTimeout(noticeTimeout);
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app">
  <header class="topbar">
    <div class="brand"><h1>Lucide KDE</h1><span class="brand-sub">Editor</span></div>
    <div class="top-actions">
      <span class="build-state" aria-live="polite">{state.needsBuild ? "Unbuilt changes" : "Archive ready"}</span>
      <button type="button" disabled={state.busy} onclick={() => execute("build")}>Build Archive</button>
      {#if !state.needsBuild}<a class="button" href="/download">Download</a>{/if}
      <button class="primary" type="button" disabled={state.busy} onclick={() => execute("apply")}>Apply to Plasma</button>
    </div>
  </header>
  {#if message}
    <div class:error={messageError} class="message" role="status" aria-live="polite">{message}</div>
  {/if}
  <main class="workspace">
    <section class="pane names-pane" aria-labelledby="names-heading">
      <div class="pane-head">
        <h2 id="names-heading">KDE icons</h2>
        <span class="muted">{filteredKde.length} names</span>
      </div>
      <div class="toolbar">
        <label class="field grow">
          <span>Source theme</span>
          <select bind:value={state.theme} disabled={state.busy} onchange={(event) => loadTheme(event.currentTarget.value)}>
            {#each state.themes as theme (theme.id)}<option value={theme.id}>{theme.label}</option>{/each}
          </select>
        </label>
        <label class="field category-field">
          <span>Category</span>
          <select bind:value={kdeCategory} disabled={state.busy} onchange={() => visibleKdeCount = 200}>
            <option value="all">All categories</option>
            {#each categories as category}<option value={category}>{categoryLabel(category)}</option>{/each}
          </select>
        </label>
      </div>
      <div class="toolbar">
        <label class="field grow">
          <span>Find KDE name</span>
          <input type="search" placeholder="Search icon names" autocomplete="off" bind:value={kdeSearch} disabled={state.busy} oninput={() => visibleKdeCount = 200}>
        </label>
        <label class="field filter-field">
          <span>Show</span>
          <select bind:value={kdeFilter} disabled={state.busy} onchange={() => visibleKdeCount = 200}>
            <option value="all">All</option><option value="assigned">Assigned</option><option value="unassigned">Unassigned</option>
          </select>
        </label>
      </div>
      <form class="manual-row" onsubmit={openManual}>
        <label class="field grow">
          <span>Manual name</span>
          <input type="text" placeholder="audio-volume-high" pattern="[A-Za-z0-9][A-Za-z0-9._-]*" autocomplete="off" bind:value={manualName} disabled={state.busy}>
        </label>
        <button type="submit" disabled={state.busy}>Open</button>
      </form>
      <div class="kde-list" role="listbox" aria-label="KDE icon names" bind:this={kdeList}>
        {#if loadingTheme}Loading…{/if}
        {#each filteredKde.slice(0, visibleKdeCount) as entry (entry.name)}
          <button type="button" class:selected={state.kde === entry.name} class="kde-row" role="option" aria-selected={state.kde === entry.name} onclick={() => selectKde(entry.name, true)}>
            <span class="kde-thumbnail">
              {#if !entry.categories.includes("manual")}
                <img src={sourceUrl(entry.name, 22, "current")} alt="" loading="lazy" decoding="async" onerror={(event) => event.currentTarget.hidden = true}>
              {/if}
            </span>
            <span class="name">{entry.name}</span><span class="source">{entry.source}</span>
            {#if Object.hasOwn(state.mappings, entry.name)}<span class="mapped-dot" title="Assigned"></span>{/if}
          </button>
        {/each}
      </div>
      {#if filteredKde.length > visibleKdeCount}
        <button class="kde-more" type="button" onclick={() => visibleKdeCount += 200}>Show more</button>
      {/if}
    </section>
    <section class="pane detail-pane" aria-labelledby="detail-heading">
      <div class="pane-head detail-head">
        <div>
          <h2 id="detail-heading">{state.kde || "Select a KDE icon"}</h2>
          <span class="muted">{selectedEntry ? `From ${selectedEntry.source} · ${selectedEntry.categories.map(categoryLabel).join(", ")}` : state.kde ? "Manual name" : ""}</span>
        </div>
        <span class="mapping-label">{assigned ? "Assigned" : ""}</span>
      </div>
      <div class="preview-toolbar">
        <div class="segmented" role="group" aria-label="Preview palette">
          {#each ["current", "light", "dark"] as palette}
            <button type="button" class:selected={state.previewPalette === palette} onclick={() => state.previewPalette = palette}>{palette[0].toUpperCase() + palette.slice(1)}</button>
          {/each}
        </div>
        <label class="size-control">Size
          <select bind:value={state.size}>
            <option value={16}>16 px</option><option value={22}>22 px</option><option value={24}>24 px</option>
          </select>
        </label>
      </div>
      <div class="preview-surface" style:--preview-window={preview.window} style:--preview-view={preview.view} style:--preview-text={preview.text}>
        <div class="comparison">
          <div class="preview-block">
            <span class="eyebrow">Original</span>
            <div class="icon-stage">
              {#if selectedEntry}<img src={sourceUrl(state.kde)} width={state.size} height={state.size} alt="">{:else}<span class="muted">—</span>{/if}
            </div>
          </div>
          <div class="preview-arrow" aria-hidden="true">→</div>
          <div class="preview-block">
            <span class="eyebrow">Assigned</span>
            <div class="icon-stage">
              {#if assigned}
                <img src={candidateUrl(assigned, state.previewPalette, mappingMirrored(state.mappings[state.kde]), mappingScale(state.mappings[state.kde]))} width={state.size} height={state.size} style:transform={`rotate(${mappingRotation(state.mappings[state.kde])}deg)`} alt="">
              {:else}<span class="muted">—</span>{/if}
            </div>
          </div>
          <div class="preview-arrow" aria-hidden="true">→</div>
          <div class="preview-block">
            <span class="eyebrow">Candidate</span>
            <div class="icon-stage">
              {#if state.candidate}
                <img src={candidateUrl(state.candidate, state.previewPalette, state.mirror, state.scale)} width={state.size} height={state.size} style:transform={`rotate(${state.rotate}deg)`} alt="">
              {:else}<span class="muted">—</span>{/if}
            </div>
          </div>
        </div>
        <div class="context-previews">
          <div class="context-block">
            <span class="eyebrow">Tray</span>
            <div class="tray">
              <span class="tray-dots" aria-hidden="true">⌃</span>
              {#if state.candidate}
                <img class="context-icon" src={candidateUrl(state.candidate, state.previewPalette, state.mirror, state.scale)} width={state.size} height={state.size} style:transform={`rotate(${state.rotate}deg)`} alt="">
              {/if}
              <span class="tray-clock">12:34</span>
            </div>
          </div>
          <div class="context-block">
            <span class="eyebrow">Notification</span>
            <div class="notification">
              {#if state.candidate}
                <img class="context-icon" src={candidateUrl(state.candidate, state.previewPalette, state.mirror, state.scale)} width={state.size} height={state.size} style:transform={`rotate(${state.rotate}deg)`} alt="">
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
              <button type="button" aria-label="Rotate counterclockwise 22.5 degrees" title="Rotate counterclockwise 22.5°" disabled={state.busy || !state.candidate} onclick={() => state.rotate = (state.rotate + 337.5) % 360}>↶</button>
              <output aria-live="polite">{state.rotate}°</output>
              <button type="button" aria-label="Rotate clockwise 22.5 degrees" title="Rotate clockwise 22.5°" disabled={state.busy || !state.candidate} onclick={() => state.rotate = (state.rotate + 22.5) % 360}>↷</button>
            </div>
            {#if isRtlName(state.kde)}
              <button type="button" aria-label="Mirror horizontally" aria-pressed={state.mirror} disabled={state.busy || !state.candidate} onclick={() => state.mirror = !state.mirror}>Mirror</button>
            {/if}
            {#if assigned}<button type="button" disabled={state.busy} onclick={() => saveMapping(null)}>Remove</button>{/if}
            <button type="button" class="primary" disabled={state.busy || !canAssign(state.candidate)} onclick={() => saveMapping(state.candidate)}>Assign</button>
          </div>
        </div>
      </div>
      <div class="lucide-head">
        <h3>Lucide icons</h3>
        <span class="muted">{filteredLucide.length} icons{filteredLucide.length > 120 ? " · first 120 shown" : ""}</span>
      </div>
      <label class="field lucide-search">
        <span class="sr-only">Find Lucide icon</span>
        <input type="search" placeholder="Search names and tags" autocomplete="off" bind:value={lucideSearch} disabled={state.busy}>
      </label>
      <div class="lucide-list" role="list" aria-label="Lucide icons" bind:this={lucideList}>
        {#each filteredLucide.slice(0, 120) as icon (icon.name)}
          <div class="lucide-cell" role="listitem">
            <button type="button" class:selected={state.candidate === icon.name} class="lucide-item" aria-pressed={state.candidate === icon.name} title={`${icon.name}\n${icon.tags.join(", ")}`} onclick={() => state.candidate = icon.name}>
              <img src={candidateUrl(icon.name, "current")} alt="" loading="lazy"><span>{icon.name}</span>
            </button>
            <button type="button" class="lucide-assign" aria-label={`Assign ${icon.name} to ${state.kde || "selected KDE icon"}`} disabled={state.busy || !canAssign(icon.name)} onclick={() => { state.candidate = icon.name; saveMapping(icon.name); }}>Assign</button>
          </div>
        {/each}
      </div>
    </section>
  </main>
  <footer><span>{state.needsBuild ? "" : state.archivePath}</span></footer>
</div>
