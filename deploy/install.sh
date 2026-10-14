#!/bin/sh
# Install and enable the systemd user units: the API and the front at boot, the daily data refresh.
# Boot start without a login needs lingering: loginctl enable-linger "$USER".
set -eu
dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
here="$(dirname "$0")"
mkdir -p "$dir"
cp "$here"/scrutins-api.service "$here"/scrutins-web.service "$here"/scrutins-refresh.service "$here"/scrutins-refresh.timer "$dir/"
systemctl --user daemon-reload
systemctl --user enable --now scrutins-api.service scrutins-web.service scrutins-refresh.timer
systemctl --user --no-pager status scrutins-api.service scrutins-web.service | grep -E "●|Active:"
systemctl --user list-timers scrutins-refresh.timer --no-pager
