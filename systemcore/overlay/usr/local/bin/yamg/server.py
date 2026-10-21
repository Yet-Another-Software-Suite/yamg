#!/usr/bin/env python3
"""Serves the YAMG static site on a socket handed over by systemd."""

import http.server
import os
import signal
import socket
import sys
from functools import partial

SD_LISTEN_FDS_START = 3


def systemd_socket() -> socket.socket:
    if os.environ.get("LISTEN_PID") != str(os.getpid()) or int(os.environ.get("LISTEN_FDS", "0")) < 1:
        sys.exit("Must be started by systemd socket activation")
    try:
        return socket.socket(fileno=SD_LISTEN_FDS_START)
    except OSError:
        # Some kernels cannot report the family of an inherited socket.
        # systemd binds dual stack IPv6 when available, otherwise IPv4.
        family = socket.AF_INET6 if socket.has_ipv6 else socket.AF_INET
        return socket.socket(family, socket.SOCK_STREAM, 0, SD_LISTEN_FDS_START)


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".txt": "text/plain",
        ".woff2": "font/woff2",
    }

    def translate_path(self, path):
        # The site is exported without trailing slashes, so /guide is guide.html, even beside a guide/ folder of
        # images, as GitHub Pages serves it
        translated = super().translate_path(path)
        if not translated.endswith(os.sep) and os.path.isfile(translated + ".html"):
            return translated + ".html"
        return translated

    def send_head(self):
        # Fall back to the exported 404 page for unknown paths
        path = self.translate_path(self.path)
        if not os.path.exists(path):
            not_found = os.path.join(self.directory, "404.html")
            if os.path.isfile(not_found):
                with open(not_found, "rb") as f:
                    body = f.read()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(body)
                return None
        return super().send_head()

    def end_headers(self):
        # Hashed build assets never change; everything else is revalidated
        if self.path.startswith("/_next/static/"):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, format, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), format % args))


def main() -> None:
    root = sys.argv[1] if len(sys.argv) > 1 else "/usr/share/yamg/www"

    httpd = http.server.ThreadingHTTPServer(("", 0), partial(Handler, directory=root), bind_and_activate=False)
    httpd.socket = systemd_socket()
    httpd.daemon_threads = True

    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    try:
        httpd.serve_forever()
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
