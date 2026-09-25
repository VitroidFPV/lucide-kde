# Lucide KDE

A KDE icon theme made from selected [Lucide](https://lucide.dev/) SVGs. The theme
inherits Breeze, so names without a Lucide replacement keep their Breeze icons.
The first version replaces `audio-volume-high` only.

## Install the theme

Download `Lucide-KDE.tar.gz` from a release, or build the archive from source:

```sh
bun install --frozen-lockfile
bun run pack
```

The build creates `dist/Lucide-KDE.tar.gz`. In **System Settings → Colors & Themes →
Icons**, click **Install from File…**, select that archive, then select **Lucide
KDE** and click **Apply**. Installing the archive does not require Bun.

The archive contains one top-level `Lucide-KDE` directory with `index.theme`, the
generated SVGs, and both license notices.

The installable theme includes the full [Lucide license](theme/Lucide-KDE/LICENSE-LUCIDE)
and this project's [GPLv3 license](theme/Lucide-KDE/LICENSE-GPL-3.0).

## Build from source

Install [Bun](https://bun.sh/), then run:

```sh
bun install --frozen-lockfile
bun run build
bun run typecheck
```

`mappings.json` maps KDE icon names to Lucide icon names. The build uses the pinned
`lucide-static` version and replaces `theme/Lucide-KDE` with generated output. For
now, every mapped icon is emitted into `scalable/status` for small system and tray
icons. Mirrored RTL assignments use an object such as
`{"icon":"arrow-right","mirror":true}`; ordinary assignments remain strings.
An object can also set `"scale":0.75` to shrink the drawing within its icon area.

## Local editor

Run `bun run editor` and open <http://127.0.0.1:3000>. The editor searches all icon
categories in installed themes and their inherited icons; use **Category** to narrow
the list. It also searches Lucide names and tags. Select a
KDE name or enter one manually, choose a Lucide candidate, then click **Assign**.
Assignments save to `mappings.json` immediately; previews do not change Plasma.
For RTL names, **Mirror** flips the candidate horizontally before assigning it.

**Build Archive** creates a downloadable `dist/Lucide-KDE.tar.gz`. **Apply to
Plasma** regenerates the theme in the current user's icon directory and requests
an icon refresh. It keeps the previous installed copy at
`~/.local/share/icons/.Lucide-KDE-previous`. Some running tray applications may
hold old pixmaps until their state changes or the theme is selected again in
System Settings. The editor binds only to localhost. See [the editor plan](EDITOR_PLAN.md)
for the current scope.

Some tray applications provide their own pixmaps instead of icon theme names;
those icons cannot be changed by this theme. Plasma may also request a
`-symbolic` icon name when one exists, so each such name needs an explicit mapping.
