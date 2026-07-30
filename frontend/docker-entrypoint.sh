#!/bin/sh
set -eu

if [ ! -s /etc/nginx/certs/dev.crt ] || [ ! -s /etc/nginx/certs/dev.key ]; then
  openssl req -x509 -nodes -newkey rsa:2048 -sha256 -days 30 \
    -keyout /etc/nginx/certs/dev.key \
    -out /etc/nginx/certs/dev.crt \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" >/dev/null 2>&1
  chmod 600 /etc/nginx/certs/dev.key
fi

exec "$@"
