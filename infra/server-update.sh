#!/usr/bin/env bash
# Install on the VPS as /usr/local/sbin/xy-train-5d-update.
set -euo pipefail

upload_file=${1:?"Usage: xy-train-5d-update /path/to/upload.html"}
site_root=/var/www/xy-train-5d
backup_dir="/var/backups/xy-train-5d/$(date -u +%Y%m%dT%H%M%SZ)"

test -f "$upload_file"
install -d -m 0755 "$site_root"
install -d -m 0700 "$backup_dir"
test ! -f "${site_root}/index.html" || cp -p "${site_root}/index.html" "$backup_dir/index.html"
install -m 0644 "$upload_file" "${site_root}/index.html.new"
mv -f -- "${site_root}/index.html.new" "${site_root}/index.html"
rm -f -- "$upload_file"
sha256sum "${site_root}/index.html"
printf 'Backup directory: %s\n' "$backup_dir"
