#!/bin/sh
set -eu

if [ "$#" -gt 1 ]; then
  printf 'Usage: %s [icon-theme-directory-name]\n' "$0" >&2
  exit 2
fi
requested=${1-}

data_home=${XDG_DATA_HOME:-"$HOME/.local/share"}
data_dirs=${XDG_DATA_DIRS:-/usr/local/share:/usr/share}
installed=
for base in "$data_home/icons" "$HOME/.icons"; do
  if [ -f "$base/Lucide-KDE/index.theme" ]; then
    installed=$base/Lucide-KDE/index.theme
    break
  fi
done

if [ -z "$installed" ]; then
  printf 'Lucide KDE is not installed in your user icon directory. Install it through System Settings first.\n' >&2
  exit 1
fi
if [ -L "$installed" ] || [ ! -w "$installed" ]; then
  printf 'Cannot safely edit %s\n' "$installed" >&2
  exit 1
fi

themes=$(mktemp) || exit 1
updated=
cleanup() {
  rm -f "$themes"
  if [ -n "$updated" ]; then rm -f "$updated"; fi
}
trap cleanup 0
trap 'exit 1' 1 2 3 15

add_themes() {
  for directory in "$1"/*; do
    [ -f "$directory/index.theme" ] || continue
    name=${directory##*/}
    case $name in
      Lucide-KDE|.*|*[!a-zA-Z0-9._+-]*) continue ;;
    esac
    awk '
      /^\[Icon Theme\][[:space:]]*$/ { in_theme = 1; next }
      /^\[/ { in_theme = 0 }
      in_theme && /^Directories[[:space:]]*=/ {
        sub(/^[^=]*=[[:space:]]*/, "")
        if ($0 ~ /[^,[:space:]]/) found = 1
      }
      END { exit !found }
    ' "$directory/index.theme" || continue
    printf '%s\n' "$name" >> "$themes"
  done
}

add_themes "$data_home/icons"
add_themes "$HOME/.icons"
old_ifs=$IFS
IFS=:
set -f
set -- $data_dirs
set +f
IFS=$old_ifs
for base do
  [ -n "$base" ] && add_themes "$base/icons"
done
sort -u "$themes" -o "$themes"

if [ -n "$requested" ]; then
  selected=$requested
else
  if [ ! -s "$themes" ]; then
    printf 'No other icon themes were found.\n' >&2
    exit 1
  fi
  printf 'Choose an icon theme for missing Lucide KDE icons:\n'
  awk '{ printf "  %d) %s\n", NR, $0 }' "$themes"
  printf 'Number: '
  IFS= read -r choice || exit 1
  case $choice in
    ''|0|*[!0-9]*) printf 'Enter a number from the list.\n' >&2; exit 2 ;;
  esac
  selected=$(sed -n "${choice}p" "$themes")
fi

if ! grep -Fqx -- "$selected" "$themes"; then
  printf 'Icon theme "%s" was not found.\n' "$selected" >&2
  exit 1
fi

inherits=$selected,breeze
if [ "$selected" = breeze ]; then inherits=breeze; fi
updated=$(mktemp "${installed}.XXXXXX") || exit 1
cp -p "$installed" "$updated"
if ! awk -v inherits="$inherits" '
  /^\[Icon Theme\][[:space:]]*$/ { in_theme = 1; found = 1; print; next }
  /^\[/ { if (in_theme && !replaced) print "Inherits=" inherits; in_theme = 0 }
  in_theme && /^Inherits[[:space:]]*=/ { if (!replaced++) print "Inherits=" inherits; next }
  { print }
  END { if (!found) exit 1; if (in_theme && !replaced) print "Inherits=" inherits }
' "$installed" > "$updated"; then
  printf 'Invalid Lucide KDE index.theme.\n' >&2
  exit 1
fi
mv "$updated" "$installed"
updated=
printf 'Lucide KDE now inherits %s.\n' "$selected"
if command -v gdbus >/dev/null 2>&1 &&
  gdbus emit --session --object-path /KIconLoader --signal org.kde.KIconLoader.iconChanged 4 >/dev/null 2>&1; then
  printf 'Requested an icon refresh. Some running applications may keep cached icons.\n'
else
  printf 'Could not request an icon refresh; reselect Lucide KDE in System Settings if needed.\n' >&2
fi
