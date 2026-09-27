# Lucide KDE

![Lucide KDE icon](editor/favicon.svg)

A KDE icon theme made from selected [Lucide](https://lucide.dev/) SVGs. The theme
inherits Breeze by default, so names without a Lucide replacement keep their Breeze icons.

## Install the theme

Download `Lucide-KDE.tar.gz` from a release, or build the archive from source:

```sh
bun install --frozen-lockfile
bun run pack
```

The build creates `dist/Lucide-KDE.tar.gz`. In **System Settings → Colors & Themes →
Icons**, click **Install from File…**, select that archive, then select **Lucide
KDE** and click **Apply**. Installing the archive does not require Bun.

The archive contains one top-level `Lucide-KDE` directory with `index.theme`, SVGs
under `scalable/<category>`, and both license notices. Icons found in multiple KDE
categories are included in each corresponding directory.

The installable theme includes the full [Lucide license](theme/Lucide-KDE/LICENSE-LUCIDE)
and this project's [GPLv3 license](theme/Lucide-KDE/LICENSE-GPL-3.0).

## Choose another icon theme for missing icons

Install Lucide KDE and the icon theme you want to inherit, then download
`inherit.sh` from the same release. Run it to choose from installed
themes:

```sh
sh inherit.sh
```

You can also pass the other theme's directory name directly, for example
`sh inherit.sh Papirus-Dark`. Lucide KDE's own icons take priority;
the selected theme supplies missing icons, with Breeze as a final fallback. Run
`sh inherit.sh breeze` to restore the default. The script edits a
user-installed Lucide KDE theme in `~/.local/share/icons` or `~/.icons` and asks
KDE to refresh its icons. Some running applications may keep cached icons; reselect
Lucide KDE in System Settings if they do not refresh. Reinstalling the archive or
using **Apply to Plasma** in the editor resets the inheritance to Breeze, so run the
script again afterward.

## Releases

Pull requests and pushes to `main` run the tests, typecheck, and archive build in
GitHub Actions. The build also checks that the committed theme matches the
generated output. Pull requests upload `Lucide-KDE.tar.gz` as a preview in the
CI run's Artifacts section.

Releases use semantic versions and Git tags. Prepare a release with:

```sh
bun run release:prepare 0.2.0
bun install --lockfile-only
git add package.json bun.lock
git commit -m "Release: 0.2.0"
git tag v0.2.0
git push origin main v0.2.0
```

The tag rebuilds and checks the archive, then creates a draft GitHub Release with
generated notes, `Lucide-KDE.tar.gz`, and `inherit.sh` attached.
Review and publish the draft in GitHub.

## Build from source

Install [Bun](https://bun.sh/), then run:

```sh
bun install --frozen-lockfile
bun run build
bun run typecheck
```

`mappings.json` maps KDE icon names to Lucide icon names. The build uses the pinned
`lucide-static` version and replaces `theme/Lucide-KDE` with generated output.
Mirrored RTL assignments use an object such as
`{"icon":"arrow-right","mirror":true}`; ordinary assignments remain strings.
An object can also set `"scale":0.75` to shrink the drawing within its icon area,
or `"categories":["actions","status"]` to place it in multiple theme directories.
Assignments without categories use `status`.

## Local editor

Run `bun run editor` and open <http://127.0.0.1:3000>. The editor searches all icon
categories in installed themes and their inherited icons; use **Category** to narrow
the list. It also searches Lucide names and tags. Select a
KDE name or enter one manually, choose a Lucide candidate, then click **Assign**.
Use **Alt+Up** and **Alt+Down** to move through the KDE names shown by the
current search and filters.
Assignments save to `mappings.json` immediately; previews do not change Plasma.
For RTL names, **Mirror** flips the candidate horizontally before assigning it.

**Build Archive** creates a downloadable `dist/Lucide-KDE.tar.gz`. **Apply to
Plasma** regenerates the theme in the current user's icon directory and requests
an icon refresh. It keeps the previous installed copy at
`~/.local/share/icons/.Lucide-KDE-previous`. Some running tray applications may
hold old pixmaps until their state changes or the theme is selected again in
System Settings. The editor binds only to localhost.

Some tray applications provide their own pixmaps instead of icon theme names;
those icons cannot be changed by this theme. Plasma may also request a
`-symbolic` icon name when one exists, so each such name needs an explicit mapping.
