const $ = (id) => document.getElementById(id);
const state = { themes: [], icons: [], lucide: [], mappings: {}, palette: null, theme: "", kde: "", candidate: "", previewPalette: "current", size: 22, needsBuild: true, busy: false };
const validKdeName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

async function api(path, options) {
  const response = await fetch(path, options);
  let body;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}
function notice(message, error = false) {
  const box = $("message");
  box.textContent = message;
  box.classList.toggle("error", error);
  box.hidden = !message;
}
function setBusy(value) {
  state.busy = value;
  for (const id of ["build", "apply", "theme", "manual-name", "kde-search", "lucide-search", "remove"]) $(id).disabled = value;
  renderSelection();
}
function applyColors(colors) {
  const variables = { window: "window", windowText: "window-text", view: "view", viewText: "view-text", button: "button", buttonText: "button-text", selection: "selection", selectionText: "selection-text" };
  for (const [key, variable] of Object.entries(variables)) document.documentElement.style.setProperty(`--${variable}`, colors[key]);
  const rgb = colors.window.match(/[0-9a-f]{2}/gi)?.map((value) => parseInt(value, 16)) || [0, 0, 0];
  document.documentElement.style.colorScheme = rgb.reduce((a, b) => a + b, 0) > 400 ? "light" : "dark";
}
function previewColors() {
  const sample = {
    light: { window: "#eff0f1", text: "#232629", view: "#fcfcfc" },
    dark: { window: "#31363b", text: "#eff0f1", view: "#232629" },
  };
  const p = state.previewPalette === "current" ? { window: state.palette.window, text: state.palette.viewText, view: state.palette.view } : sample[state.previewPalette];
  const surface = $("preview-surface");
  surface.style.setProperty("--preview-window", p.window);
  surface.style.setProperty("--preview-view", p.view);
  surface.style.setProperty("--preview-text", p.text);
}
function sourceUrl(name) {
  return `/api/source?theme=${encodeURIComponent(state.theme)}&name=${encodeURIComponent(name)}&size=${state.size}&palette=${state.previewPalette}`;
}
function candidateUrl(name) {
  return `/api/candidate?name=${encodeURIComponent(name)}&palette=${state.previewPalette}`;
}
function renderStatus() {
  $("build-state").textContent = state.needsBuild ? "Unbuilt changes" : "Archive ready";
  $("download").hidden = state.needsBuild;
  $("archive-path").textContent = state.needsBuild ? "" : state.archivePath;
}
function renderKde() {
  const query = $("kde-search").value.trim().toLowerCase();
  const assigned = new Set(Object.keys(state.mappings));
  const entries = [...state.icons];
  for (const name of assigned) if (!entries.some((entry) => entry.name === name)) entries.push({ name, source: "Manual" });
  if (state.kde && !entries.some((entry) => entry.name === state.kde)) entries.push({ name: state.kde, source: "Manual" });
  const base = (name) => name.replace(/-(symbolic|rtl)$/, "");
  entries.sort((a, b) => base(a.name).localeCompare(base(b.name)) || a.name.localeCompare(b.name));
  const filtered = entries.filter((entry) => entry.name.toLowerCase().includes(query));
  $("icon-count").textContent = `${filtered.length} names`;
  const list = $("kde-list");
  list.replaceChildren();
  for (const entry of filtered) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `kde-row${state.kde === entry.name ? " selected" : ""}`;
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(state.kde === entry.name));
    const name = document.createElement("span"); name.className = "name"; name.textContent = entry.name;
    const source = document.createElement("span"); source.className = "source"; source.textContent = entry.source;
    row.append(name, source);
    if (assigned.has(entry.name)) { const dot = document.createElement("span"); dot.className = "mapped-dot"; dot.title = "Assigned"; row.append(dot); }
    row.addEventListener("click", () => selectKde(entry.name));
    list.append(row);
  }
}
function renderLucide() {
  const terms = $("lucide-search").value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = state.lucide.filter((icon) => terms.every((term) => `${icon.name} ${icon.tags.join(" ")}`.toLowerCase().includes(term)));
  $("lucide-count").textContent = `${filtered.length} icons${filtered.length > 120 ? " · first 120 shown" : ""}`;
  const list = $("lucide-list");
  list.replaceChildren();
  for (const icon of filtered.slice(0, 120)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `lucide-item${state.candidate === icon.name ? " selected" : ""}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(state.candidate === icon.name));
    button.title = `${icon.name}\n${icon.tags.join(", ")}`;
    const image = document.createElement("img"); image.src = candidateUrl(icon.name); image.alt = ""; image.loading = "lazy";
    const label = document.createElement("span"); label.textContent = icon.name;
    button.append(image, label);
    button.addEventListener("click", () => { state.candidate = icon.name; renderSelection(); renderLucide(); });
    list.append(button);
  }
}
function renderSelection() {
  const entry = state.icons.find((icon) => icon.name === state.kde);
  const assigned = state.kde ? state.mappings[state.kde] : null;
  $("detail-heading").textContent = state.kde || "Select a KDE icon";
  $("source-label").textContent = entry ? `From ${entry.source}` : state.kde ? "Manual name" : "";
  $("mapping-label").textContent = assigned ? "Assigned" : "";
  $("assignment-name").textContent = assigned || "—";
  $("remove").hidden = !assigned;
  $("remove").disabled = state.busy;
  $("assign").disabled = state.busy || !state.kde || !state.candidate || assigned === state.candidate;
  const original = $("original-icon");
  original.hidden = !entry;
  $("original-empty").hidden = !!entry;
  if (entry) { original.src = sourceUrl(state.kde); original.width = state.size; original.height = state.size; }
  const candidate = $("candidate-icon");
  candidate.hidden = !state.candidate;
  $("candidate-empty").hidden = !!state.candidate;
  if (state.candidate) { candidate.src = candidateUrl(state.candidate); candidate.width = state.size; candidate.height = state.size; }
  for (const image of document.querySelectorAll(".context-icon")) {
    image.hidden = !state.candidate;
    if (state.candidate) { image.src = candidateUrl(state.candidate); image.width = state.size; image.height = state.size; }
  }
}
function selectKde(name) {
  state.kde = name;
  state.candidate = state.mappings[name] || "";
  renderKde(); renderSelection(); renderLucide();
  $("kde-list").querySelector(".selected")?.scrollIntoView({ block: "center" });
}
async function loadTheme(id) {
  notice("");
  state.theme = id;
  $("theme").value = id;
  $("kde-list").textContent = "Loading…";
  try { state.icons = await api(`/api/icons?theme=${encodeURIComponent(id)}`); }
  catch (error) { state.icons = []; notice(error.message, true); }
  renderKde(); renderSelection();
}
async function saveMapping(lucideName) {
  if (!state.kde) return;
  setBusy(true); notice("");
  try {
    const result = await api("/api/mapping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kdeName: state.kde, lucideName }) });
    state.mappings = result.mappings; state.needsBuild = true;
    if (lucideName === null) state.candidate = "";
    renderStatus(); renderKde(); renderSelection(); renderLucide();
    notice(lucideName ? "Assignment saved" : "Assignment removed");
  } catch (error) { notice(error.message, true); }
  finally { setBusy(false); }
}
async function execute(action) {
  setBusy(true); notice(action === "build" ? "Building archive…" : "Applying theme…");
  try {
    const result = await api(`/api/${action}`, { method: "POST" });
    state.needsBuild = result.needsBuild;
    state.archivePath = result.archivePath;
    renderStatus();
    if (action === "apply") {
      const updated = await api("/api/state");
      const selector = $("theme");
      selector.replaceChildren();
      state.themes = updated.themes;
      for (const theme of state.themes) { const option = document.createElement("option"); option.value = theme.id; option.textContent = theme.label; selector.append(option); }
      await loadTheme(state.theme);
    }
    notice(action === "build" ? "Archive ready" : "Applied to Plasma. If an icon stays cached, change its state or reselect the theme.");
  } catch (error) { notice(error.message, true); }
  finally { setBusy(false); }
}

$("kde-search").addEventListener("input", renderKde);
$("lucide-search").addEventListener("input", renderLucide);
$("theme").addEventListener("change", (event) => loadTheme(event.target.value));
$("manual-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("manual-name").value.trim();
  if (!validKdeName.test(name)) { notice("Use letters, numbers, dots, underscores, and hyphens", true); return; }
  $("kde-search").value = ""; selectKde(name); notice("");
});
$("assign").addEventListener("click", () => saveMapping(state.candidate));
$("remove").addEventListener("click", () => saveMapping(null));
$("build").addEventListener("click", () => execute("build"));
$("apply").addEventListener("click", () => execute("apply"));
$("size").addEventListener("change", (event) => { state.size = Number(event.target.value); renderSelection(); });
for (const button of document.querySelectorAll("[data-palette]")) button.addEventListener("click", () => {
  state.previewPalette = button.dataset.palette;
  for (const other of document.querySelectorAll("[data-palette]")) other.classList.toggle("selected", other === button);
  previewColors(); renderSelection(); renderLucide();
});

try {
  const [initial, lucide] = await Promise.all([api("/api/state"), api("/api/lucide")]);
  Object.assign(state, initial); state.lucide = lucide;
  applyColors(state.palette); previewColors(); renderStatus();
  const selector = $("theme");
  for (const theme of state.themes) { const option = document.createElement("option"); option.value = theme.id; option.textContent = theme.label; selector.append(option); }
  await loadTheme(state.defaultTheme);
  renderLucide();
  const first = state.icons.find((icon) => state.mappings[icon.name]) || state.icons.find((icon) => icon.name === "audio-volume-high") || state.icons[0];
  if (first) selectKde(first.name);
} catch (error) { notice(error.message, true); }
