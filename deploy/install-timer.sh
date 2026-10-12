#!/bin/sh
# Install and enable the daily refresh as a systemd user timer.
set -eu
dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
mkdir -p "$dir"
cp "$(dirname "$0")"/scrutins-refresh.service "$(dirname "$0")"/scrutins-refresh.timer "$dir/"
systemctl --user daemon-reload
systemctl --user enable --now scrutins-refresh.timer
systemctl --user list-timers scrutins-refresh.timer --no-pager
