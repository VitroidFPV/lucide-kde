import { searchKdeNames } from "./search.js";

const $ = (id) => document.getElementById(id);
const state = { themes: [], icons: [], lucide: [], mappings: {}, palette: null, theme: "", kde: "", candidate: "", mirror: false, scale: 1, previewPalette: "current", size: 22, needsBuild: true, busy: false };
const validKdeName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
let noticeTimeout;
let visibleKdeCount = 200;
let filteredKdeNames = [];
const mappingIcon = (mapping) => typeof mapping === "string" ? mapping : mapping?.icon || "";
const mappingMirrored = (mapping) => typeof mapping === "object" && mapping?.mirror === true;
const mappingScale = (mapping) => typeof mapping === "object" && mapping?.scale || 1;
const isRtlName = (name) => /-rtl(?:-symbolic)?$/.test(name);
const categoryLabel = (category) => category === "mimetypes" ? "MIME types" : category[0].toUpperCase() + category.slice(1);
const canAssign = (name) => {
  const mapping = state.mappings[state.kde];
  return !!state.kde && !!name && (mappingIcon(mapping) !== name || mappingMirrored(mapping) !== state.mirror);
};
function updateQuickAssignButtons() {
  for (const button of document.querySelectorAll(".lucide-assign")) button.disabled = state.busy || !canAssign(button.dataset.icon);
}

async function api(path, options) {
  const response = await fetch(path, options);
  let body;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}
function notice(message, error = false, duration = 0) {
  clearTimeout(noticeTimeout);
  const box = $("message");
  box.textContent = message;
  box.classList.toggle("error", error);
  box.hidden = !message;
  if (duration) noticeTimeout = setTimeout(() => { box.hidden = true; }, duration);
}
function setBusy(value) {
  state.busy = value;
  for (const id of ["build", "apply", "theme", "manual-name", "kde-search", "kde-category", "kde-filter", "lucide-search", "remove"]) $(id).disabled = value;
  updateQuickAssignButtons();
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
function sourceUrl(name, size = state.size, palette = state.previewPalette) {
  return `/api/source?theme=${encodeURIComponent(state.theme)}&name=${encodeURIComponent(name)}&size=${size}&palette=${palette}`;
}
function candidateUrl(name, palette = state.previewPalette, mirror = false, scale = 1) {
  return `/api/candidate?name=${encodeURIComponent(name)}&palette=${palette}${mirror ? "&mirror=1" : ""}${scale !== 1 ? `&scale=${scale}` : ""}`;
}
function renderStatus() {
  $("build-state").textContent = state.needsBuild ? "Unbuilt changes" : "Archive ready";
  $("download").hidden = state.needsBuild;
  $("archive-path").textContent = state.needsBuild ? "" : state.archivePath;
}
function renderKde() {
  const query = $("kde-search").value.trim().toLowerCase();
  const filter = $("kde-filter").value;
  const assigned = new Set(Object.keys(state.mappings));
  const entries = [...state.icons];
  for (const name of assigned) if (!entries.some((entry) => entry.name === name)) entries.push({ name, source: "Manual", categories: ["manual"] });
  if (state.kde && !entries.some((entry) => entry.name === state.kde)) entries.push({ name: state.kde, source: "Manual", categories: ["manual"] });
  const categorySelect = $("kde-category");
  const selectedCategory = categorySelect.value;
  const categories = [...new Set(entries.flatMap((entry) => entry.categories))].sort();
  categorySelect.replaceChildren(new Option("All categories", "all"));
  for (const category of categories) {
    categorySelect.add(new Option(categoryLabel(category), category));
  }
  categorySelect.value = categories.includes(selectedCategory) ? selectedCategory : "all";
  const base = (name) => name.replace(/-(symbolic|rtl)$/, "");
  entries.sort((a, b) => base(a.name).localeCompare(base(b.name)) || a.name.localeCompare(b.name));
  const filtered = searchKdeNames(entries.filter((entry) => (
    (categorySelect.value === "all" || entry.categories.includes(categorySelect.value))
    && (filter === "all" || assigned.has(entry.name) === (filter === "assigned"))
  )), query, state.mappings);
  filteredKdeNames = filtered.map((entry) => entry.name);
  $("icon-count").textContent = `${filtered.length} names`;
  const list = $("kde-list");
  list.replaceChildren();
  for (const entry of filtered.slice(0, visibleKdeCount)) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `kde-row${state.kde === entry.name ? " selected" : ""}`;
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(state.kde === entry.name));
    const thumbnail = document.createElement("span"); thumbnail.className = "kde-thumbnail";
    if (!entry.categories.includes("manual")) {
      const image = document.createElement("img");
      image.src = sourceUrl(entry.name, 22, "current");
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", () => { image.hidden = true; });
      thumbnail.append(image);
    }
    const name = document.createElement("span"); name.className = "name"; name.textContent = entry.name;
    const source = document.createElement("span"); source.className = "source"; source.textContent = entry.source;
    row.append(thumbnail, name, source);
    if (assigned.has(entry.name)) { const dot = document.createElement("span"); dot.className = "mapped-dot"; dot.title = "Assigned"; row.append(dot); }
    row.addEventListener("click", () => selectKde(entry.name, true));
    list.append(row);
  }
  $("kde-more").hidden = filtered.length <= visibleKdeCount;
}
function renderLucide() {
  const terms = $("lucide-search").value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = state.lucide.filter((icon) => terms.every((term) => `${icon.name} ${icon.tags.join(" ")}`.toLowerCase().includes(term)));
  $("lucide-count").textContent = `${filtered.length} icons${filtered.length > 120 ? " · first 120 shown" : ""}`;
  const list = $("lucide-list");
  list.replaceChildren();
  for (const icon of filtered.slice(0, 120)) {
    const cell = document.createElement("div");
    cell.className = "lucide-cell";
    cell.setAttribute("role", "listitem");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `lucide-item${state.candidate === icon.name ? " selected" : ""}`;
    button.dataset.icon = icon.name;
    button.setAttribute("aria-pressed", String(state.candidate === icon.name));
    button.title = `${icon.name}\n${icon.tags.join(", ")}`;
    const image = document.createElement("img"); image.src = candidateUrl(icon.name, "current"); image.alt = ""; image.loading = "lazy";
    const label = document.createElement("span"); label.textContent = icon.name;
    button.append(image, label);
    button.addEventListener("click", () => previewCandidate(icon.name));
    const assign = document.createElement("button");
    assign.type = "button";
    assign.className = "lucide-assign";
    assign.dataset.icon = icon.name;
    assign.textContent = "Assign";
    assign.setAttribute("aria-label", `Assign ${icon.name} to ${state.kde || "selected KDE icon"}`);
    assign.disabled = state.busy || !canAssign(icon.name);
    assign.addEventListener("click", () => { previewCandidate(icon.name); saveMapping(icon.name); });
    cell.append(button, assign);
    list.append(cell);
  }
}
function previewCandidate(name) {
  state.candidate = name;
  renderSelection();
  for (const button of document.querySelectorAll(".lucide-item")) {
    const selected = button.dataset.icon === name;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
}
function renderSelection() {
  const entry = state.icons.find((icon) => icon.name === state.kde);
  const mapping = state.kde ? state.mappings[state.kde] : null;
  const assigned = mappingIcon(mapping);
  const assignedMirror = mappingMirrored(mapping);
  const assignedScale = mappingScale(mapping);
  $("detail-heading").textContent = state.kde || "Select a KDE icon";
  $("source-label").textContent = entry ? `From ${entry.source} · ${entry.categories.map(categoryLabel).join(", ")}` : state.kde ? "Manual name" : "";
  $("mapping-label").textContent = assigned ? "Assigned" : "";
  $("assignment-name").textContent = assigned || "—";
  const mirrorButton = $("mirror");
  mirrorButton.hidden = !isRtlName(state.kde);
  mirrorButton.disabled = state.busy || !state.candidate;
  mirrorButton.setAttribute("aria-pressed", String(state.mirror));
  $("remove").hidden = !assigned;
  $("remove").disabled = state.busy;
  $("assign").disabled = state.busy || !canAssign(state.candidate);
  const original = $("original-icon");
  original.hidden = !entry;
  $("original-empty").hidden = !!entry;
  if (entry) { original.src = sourceUrl(state.kde); original.width = state.size; original.height = state.size; }
  const assignedIcon = $("assigned-icon");
  assignedIcon.hidden = !assigned;
  $("assigned-empty").hidden = !!assigned;
  if (assigned) { assignedIcon.src = candidateUrl(assigned, state.previewPalette, assignedMirror, assignedScale); assignedIcon.width = state.size; assignedIcon.height = state.size; }
  const candidate = $("candidate-icon");
  candidate.hidden = !state.candidate;
  $("candidate-empty").hidden = !!state.candidate;
  if (state.candidate) { candidate.src = candidateUrl(state.candidate, state.previewPalette, state.mirror, state.scale); candidate.width = state.size; candidate.height = state.size; }
  for (const image of document.querySelectorAll(".context-icon")) {
    image.hidden = !state.candidate;
    if (state.candidate) { image.src = candidateUrl(state.candidate, state.previewPalette, state.mirror, state.scale); image.width = state.size; image.height = state.size; }
  }
}
function selectKde(name, focus = false) {
  state.kde = name;
  state.candidate = mappingIcon(state.mappings[name]);
  state.mirror = mappingMirrored(state.mappings[name]);
  state.scale = mappingScale(state.mappings[name]);
  renderKde(); renderSelection(); renderLucide();
  const selected = $("kde-list").querySelector(".selected");
  selected?.scrollIntoView({ block: "center" });
  if (focus) selected?.focus({ preventScroll: true });
}
async function loadTheme(id) {
  notice("");
  visibleKdeCount = 200;
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
    const result = await api("/api/mapping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kdeName: state.kde, lucideName, mirror: state.mirror }) });
    state.mappings = result.mappings; state.needsBuild = true;
    if (lucideName === null) { state.candidate = ""; state.mirror = false; state.scale = 1; }
    renderStatus(); renderKde(); renderSelection(); renderLucide();
    notice(lucideName ? "Assignment saved" : "Assignment removed", false, 4000);
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
    notice(action === "build" ? "Archive ready" : "Applied to Plasma. If an icon stays cached, change its state or reselect the theme.", false, action === "apply" ? 8000 : 4000);
  } catch (error) { notice(error.message, true); }
  finally { setBusy(false); }
}

for (const id of ["kde-search", "kde-category", "kde-filter"]) $(id).addEventListener(id === "kde-search" ? "input" : "change", () => { visibleKdeCount = 200; renderKde(); });
$("kde-more").addEventListener("click", () => { visibleKdeCount += 200; renderKde(); });
document.addEventListener("keydown", (event) => {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
  if (event.target instanceof HTMLSelectElement || !filteredKdeNames.length) return;
  event.preventDefault();
  const direction = event.key === "ArrowDown" ? 1 : -1;
  const index = filteredKdeNames.indexOf(state.kde);
  const next = index < 0 ? (direction === 1 ? 0 : filteredKdeNames.length - 1) : index + direction;
  if (next < 0 || next >= filteredKdeNames.length) return;
  if (next >= visibleKdeCount) visibleKdeCount = Math.ceil((next + 1) / 200) * 200;
  const focusList = $("kde-list").contains(event.target) || $("lucide-list").contains(event.target);
  selectKde(filteredKdeNames[next], focusList);
});
$("lucide-search").addEventListener("input", renderLucide);
$("theme").addEventListener("change", (event) => loadTheme(event.target.value));
$("manual-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("manual-name").value.trim();
  if (!validKdeName.test(name)) { notice("Use letters, numbers, dots, underscores, and hyphens", true); return; }
  $("kde-search").value = name; $("kde-category").value = "all"; $("kde-filter").value = "all"; visibleKdeCount = 200; selectKde(name); notice("");
});
$("assign").addEventListener("click", () => saveMapping(state.candidate));
$("mirror").addEventListener("click", () => { state.mirror = !state.mirror; renderSelection(); updateQuickAssignButtons(); });
$("remove").addEventListener("click", () => saveMapping(null));
$("build").addEventListener("click", () => execute("build"));
$("apply").addEventListener("click", () => execute("apply"));
$("size").addEventListener("change", (event) => { state.size = Number(event.target.value); renderSelection(); });
for (const button of document.querySelectorAll("[data-palette]")) button.addEventListener("click", () => {
  state.previewPalette = button.dataset.palette;
  for (const other of document.querySelectorAll("[data-palette]")) other.classList.toggle("selected", other === button);
  previewColors(); renderSelection();
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
