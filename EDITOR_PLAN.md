# Editor plan

## Purpose

A local Bun app for assigning Lucide icons to KDE status icon names. The
installable theme and `mappings.json` remain the published output and source of
truth. The app is an authoring tool.

## Interface

- Two panes: KDE names on the left; Lucide search, assignment, and previews on
  the right. Use only labels, controls, and messages needed to complete a task.
- Follow the active KDE application palette. The preview alone can switch among
  the current palette and KDE light/dark sample palettes.
- Show the candidate at 22 px by default, with 16 and 24 px options, in a generic
  tray and a static notification using that same icon. These are contextual
  previews, not pixel-exact Plasma screenshots.
- Use plain browser UI and restrained styling. No frontend framework is needed
  for this scope.

## Authoring flow

1. Choose an installed source theme, defaulting to Breeze. Browse effective
   status icon names, including inherited icons, with their source theme shown.
   Keep symbolic and RTL names individually selectable and grouped near their
   base names. Search names and allow manual KDE names.
2. Search Lucide icons by name and descriptive tags. Selecting a candidate only
   previews it. **Assign** writes the exact KDE name to `mappings.json`; an
   existing assignment can be changed or removed.
3. **Build Archive** runs the existing theme generator and packer. Show a
   download action and the local archive path. Indicate when saved mappings have
   not yet been built.
4. **Apply to Plasma** explicitly syncs the generated theme to the current
   user's `~/.local/share/icons/Lucide-KDE` and asks KDE to refresh icons.
   Assigning a candidate never changes the installed theme. Icon caches may
   delay redraws; test with the volume icon and give a concise fallback if KDE
   does not refresh it.

## Implementation shape

- Bind the Bun server to localhost and serve static HTML, CSS, and browser JS.
- Discover themes from installed icon directories, follow `Inherits`, and serve
  only validated, discovered icon assets. Resolve symlinks safely.
- Share mapping validation between the editor and generator. Save the JSON
  atomically so an interrupted write does not corrupt it.
- Read the active KDE palette from `kdeglobals`; refresh it on page reload for
  the first version. Use sensible KDE colors if a value is absent.
- Keep archive creation in the existing build path. Apply only to the user's
  installed theme directory, never to system icon directories.

## Done when

- A user can find or enter a KDE status name, find a Lucide icon, preview it,
  assign it, remove it, build the archive, and download it.
- The selected source theme shows inherited names and exact symbolic/RTL names.
- The app uses the active KDE palette and its previews remain legible at all
  three sizes in light and dark samples.
- An explicit desktop apply updates the user-installed theme and requests a
  refresh. The volume icon is checked in Plasma; any remaining cache delay is
  reported accurately.

Live tray inspection, real notifications, and automatic desktop application
are outside this first version.
