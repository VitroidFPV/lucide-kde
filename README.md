# Lucide KDE

A KDE icon theme made from selected [Lucide](https://lucide.dev/) SVGs. The theme
inherits Breeze, so names without a Lucide replacement keep their Breeze icons.
The first version replaces `audio-volume-high` only.

## Install the theme

Copy `theme/Lucide-KDE` to `~/.local/share/icons/`, then choose **Lucide KDE** in
System Settings → Colors & Themes → Icons. The installed theme does not need Bun.

```sh
mkdir -p ~/.local/share/icons
cp -a theme/Lucide-KDE ~/.local/share/icons/
```

The installable theme includes the full [Lucide license](theme/Lucide-KDE/LICENSE-LUCIDE)
and this project's [GPLv3 license](theme/Lucide-KDE/LICENSE-GPL-3.0).

## Build from source

Install [Bun](https://bun.sh/), then run:

```sh
bun install --frozen-lockfile
bun run build
```

`mappings.json` maps KDE icon names to Lucide icon names. The build uses the pinned
`lucide-static` version and replaces `theme/Lucide-KDE` with generated output. For
now, every mapped icon is emitted into `scalable/status` for small system and tray
icons. More icon contexts and the local picker are planned after this first slice.

Some tray applications provide their own pixmaps instead of icon theme names;
those icons cannot be changed by this theme. Plasma may also request a
`-symbolic` icon name when one exists, so each such name needs an explicit mapping.
