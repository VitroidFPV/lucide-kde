const words = (value) => value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

function oneEditAway(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length === b.length && a[i] === b[j + 1] && a[i + 1] === b[j]
      && a.slice(i + 2) === b.slice(j + 2)) return true;
    if (a.length >= b.length) i++;
    if (a.length <= b.length) j++;
  }
  return true;
}

function score(value, query) {
  const name = value.toLowerCase();
  const compact = words(value).join("");
  const terms = words(query);
  if (!terms.length) return 0;
  const normalized = terms.join("-");
  if (name === normalized) return 0;
  if (name.startsWith(normalized)) return 1;
  if (name.includes(normalized)) return 2;
  if (compact.includes(terms.join(""))) return 3;

  const parts = words(value);
  let total = 4;
  for (const term of terms) {
    const match = Math.min(...parts.map((part) => {
      if (part === term) return 0;
      if (part.startsWith(term)) return 1;
      if (part.includes(term)) return 2;
      return term.length >= 4 && oneEditAway(term, part) ? 3 : Infinity;
    }));
    if (!Number.isFinite(match)) return Infinity;
    total += match;
  }
  return total;
}

export function searchKdeNames(entries, query, mappings) {
  if (!query.trim()) return entries;
  return entries.map((entry, index) => {
    const mapping = mappings[entry.name];
    const assigned = typeof mapping === "string" ? mapping : mapping?.icon;
    return { entry, index, score: Math.min(score(entry.name, query), assigned ? score(assigned, query) + 10 : Infinity) };
  }).filter((result) => Number.isFinite(result.score))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((result) => result.entry);
}
