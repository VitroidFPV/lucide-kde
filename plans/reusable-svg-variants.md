# Reusable SVG variants and per-element theme colors

Status: design agreed with the user; ready for implementation in a new thread. This file is the handoff. No feature code was changed while planning.

## Goal

Allow a KDE icon name to use a reusable local SVG variant. In the editor, a user can copy a Lucide icon into a variant and assign KDE theme color roles to individual strokes. Local SVGs can also be added by hand, including icons not yet in Lucide. Several KDE names may map to the same variant without changing other uses of its Lucide source.

For example, `audio-volume-high-danger` and `audio-volume-high-warning` currently use the same Lucide `volume-2` shape. They should be able to use distinct local variants, and another KDE name should be able to reuse either variant.

## Agreed behavior

- Store complete, standalone local SVG source files in `icons/local/`, outside `theme/Lucide-KDE`, which is generated and replaced on build. Reference `icons/local/volume-2-danger.svg` as `"local:volume-2-danger"`; use that source reference in both string and object mappings, for example `{ "icon": "local:volume-2-danger", "rotate": 22.5 }`. Preserve existing Lucide mapping syntax.
- A local SVG can be mapped to any number of KDE icon names. Existing mapping controls (`mirror`, `scale`, `rotate`, and `categories`) also apply to local sources.
- The editor recolors individual leaf SVG shapes (`path`, `line`, `circle`, etc.), not arbitrary subsegments of a shape or whole nested groups. A shape may be selected by clicking it in the SVG preview or through an element list for overlapping shapes. Finer geometry editing can come later.
- Each selected shape's **stroke** may use normal text, positive, neutral, negative, accent, or highlight. Unedited strokes in Lucide-derived variants continue to use normal text. A single variant may mix roles. Stroke editing leaves fills alone; hand-added SVGs retain their authored paint unless explicitly converted.
- Use KDE's documented `ColorScheme-*` SVG classes and `currentColor`, with fallback colors for viewing an SVG outside KDE. KDE does not document SVG icon classes for link or visited text, so those roles are outside this version. See https://api.kde.org/kiconcolors.html and https://develop.kde.org/docs/plasma/theme/theme-colors/.
- Preserve a hand-added SVG's authored colors by default. Offer an explicit **Use theme color** action that converts visible strokes and fills to normal theme text color while preserving `none`, transparency, and opacity. Save the converted SVG once as a reusable local source, not as a per-mapping override. Preserve SVG features that the editor cannot safely recolor; make unsupported edits clear rather than silently changing the artwork.
- **Save as variant** creates a named local SVG and assigns it to the current KDE name in one action. Other mappings using the original Lucide icon stay unchanged. Editing an existing local variant shows its KDE uses; saving it updates all uses. **Save as variant** makes a separate copy when only one use should change.
- The first editor version needs create, select, and edit workflows. Rename and delete controls are not required; files may be managed manually.
- Stay within the existing editor's visual design. Keep the current, light, and dark preview options, but make semantic colors distinct and accurate enough to judge the result.

## Current code and implementation outline

1. **Source resolution and mappings.** `src/mappings.ts` currently accepts only validated Lucide names. Add one explicit local source reference format and validate names against path traversal. Add a source reader shared by generation and editor. Source files should be regular `.svg` documents in one tracked directory. Keep mappings that use plain Lucide names valid.
2. **SVG rendering.** `src/lucide.ts` currently assumes Lucide's root paint attributes and wraps all content in one `ColorScheme-Text` group. Refactor the SVG handling so local SVGs can retain their own shape-level paint and KDE role classes, while existing Lucide output remains compatible. Apply mapping transforms around either source type. Arbitrary valid SVGs may use nested groups, inline styles, or lack a `viewBox`; handle supported cases robustly and give a clear error when a transform needs geometry that cannot be determined. Do not silently discard authored colors, fills, or definitions.
3. **Generation and packaging.** `src/generate.ts` should resolve Lucide or local sources and produce the same category outputs. The local SVG directory is an input, not a generated output. `src/package.ts` should continue packaging generated theme files. Keep validation before replacing the generated theme.
4. **Editor API.** `editor/server.ts` currently lists Lucide icons and creates candidates only from `readLucide`. Add local source listing and preview, variant creation/update, and mapping assignment. Validate file names and SVG content before writing. Saving a new variant and its mapping should not leave one half applied if the other step fails. Build staleness currently checks `mappings.json`; include local SVG changes so the archive cannot be downloaded as current after a variant edit.
5. **Editor UI.** The editor is now Svelte (`editor/App.svelte` and `editor/components/*`). Add local sources to candidate selection. For editing, display an inline SVG so leaf shapes can be selected, alongside an accessible element list and a role selector. Show all KDE names that use an existing variant. Add **Use theme color**, save, and save-as actions. Keep generated candidate, tray, and notification previews in sync.
6. **Palettes.** `editor/palette.ts` currently reads normal palette colors, while `editor/server.ts` paints all semantic SVG classes with the same preview color. Supply distinct normal, positive, neutral, negative, accent, and highlight preview values for current/light/dark palettes using KDE's icon color conventions. Keep the preview behavior consistent with the generated SVG's KDE classes.
7. **Documentation and verification.** Update `README.md` with local SVG location, mapping syntax, role behavior, and editor workflow. Add focused checks for legacy mappings, local source resolution and transforms, role-colored output, conversion preserving `none`/opacity, variant reuse, and rebuild detection. Run the repo's relevant check, typecheck, editor check, and build commands. Do not start a dev server unless needed; stop it afterward.

## Acceptance examples

- `"audio-volume-high-danger": "local:volume-2-danger"` builds a theme-colored variant, while an existing `"volume-2"` mapping still renders the unmodified Lucide icon.
- Two KDE names referencing `local:volume-2-danger` produce the same artwork; editing that SVG updates both on the next build. Saving a copy can change one mapping without changing the other.
- One variant can have a negative stroke and a normal stroke. Current, light, and dark previews visibly reflect those different roles, and Plasma changes them with the color scheme.
- A hand-added monochrome SVG can be selected and mapped. **Use theme color** makes its visible stroke and fill follow the theme while leaving `fill="none"`, transparency, and opacity intact.
- Existing mappings and generated Lucide icons still work. A local SVG edit marks the archive as needing a rebuild.

## Scope limits

No link/visited SVG roles, arbitrary subpath editing, fill role editing, variant rename/delete UI, or automatic recoloring of authored multicolor SVGs. Hand-added SVGs are preserved until the user explicitly converts them.
