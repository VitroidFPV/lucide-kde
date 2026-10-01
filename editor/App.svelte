<script>
  import { onMount } from "svelte";
  import EditorHeader from "./components/EditorHeader.svelte";
  import KdePane from "./components/KdePane.svelte";
  import IconPreview from "./components/IconPreview.svelte";
  import LucideList from "./components/LucideList.svelte";
  import { mappingIcon, mappingMirrored, mappingScale, mappingRotation } from "./icons.js";

  let state = $state({ themes: [], icons: [], lucide: [], mappings: {}, palette: null, theme: "", kde: "", needsBuild: true, busy: false, archivePath: "" });
  let candidate = $state({ name: "", mirror: false, scale: 1, rotate: 0 });
  let loadingTheme = $state(false);
  let message = $state("");
  let messageError = $state(false);
  let noticeTimeout;
  let kdePane;

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

  function canAssign(name) {
    const mapping = state.mappings[state.kde];
    return !!state.kde && !!name && (mappingIcon(mapping) !== name || mappingMirrored(mapping) !== candidate.mirror || mappingRotation(mapping) !== candidate.rotate);
  }

  function selectKde(name, focus = false) {
    state.kde = name;
    candidate = {
      name: mappingIcon(state.mappings[name]),
      mirror: mappingMirrored(state.mappings[name]),
      scale: mappingScale(state.mappings[name]),
      rotate: mappingRotation(state.mappings[name]),
    };
    kdePane?.revealSelection(focus);
  }

  async function loadTheme(id) {
    notice("");
    state.theme = id;
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
      const result = await api("/api/mapping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kdeName: state.kde, lucideName, mirror: candidate.mirror, rotate: candidate.rotate, categories }) });
      state.mappings = result.mappings;
      state.needsBuild = true;
      if (lucideName === null) { candidate.name = ""; candidate.mirror = false; candidate.scale = 1; candidate.rotate = 0; }
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

<div class="app">
  <EditorHeader needsBuild={state.needsBuild} busy={state.busy} onBuild={() => execute("build")} onApply={() => execute("apply")} />
  {#if message}
    <div class:error={messageError} class="message" role="status" aria-live="polite">{message}</div>
  {/if}
  <main class="workspace">
    <KdePane
      bind:this={kdePane}
      themes={state.themes}
      icons={state.icons}
      mappings={state.mappings}
      theme={state.theme}
      kdeName={state.kde}
      busy={state.busy}
      loading={loadingTheme}
      onThemeChange={loadTheme}
      onSelect={selectKde}
      onNotice={notice}
    />
    <section class="pane detail-pane" aria-labelledby="detail-heading">
      <IconPreview
        theme={state.theme}
        kdeName={state.kde}
        entry={state.icons.find((entry) => entry.name === state.kde)}
        mapping={state.mappings[state.kde]}
        bind:candidate
        palette={state.palette}
        busy={state.busy}
        canAssign={canAssign(candidate.name)}
        onSave={saveMapping}
      />
      <LucideList
        icons={state.lucide}
        kdeName={state.kde}
        candidateName={candidate.name}
        busy={state.busy}
        {canAssign}
        onPreview={(name) => candidate.name = name}
        onAssign={(name) => { candidate.name = name; saveMapping(name); }}
      />
    </section>
  </main>
  <footer><span>{state.needsBuild ? "" : state.archivePath}</span></footer>
</div>
