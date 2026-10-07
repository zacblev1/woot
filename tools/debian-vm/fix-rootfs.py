"""Rewrite a `docker export` tarball for booting outside docker.

Drops /.dockerenv (systemd would detect a container) and replaces the
bind-mount placeholders for /etc/hostname and /etc/hosts with real files.
usage: fix-rootfs.py <in.tar> <out.tar> <overlay-dir>
"""
import io
import os
import sys
import tarfile

src, dst, overlay = sys.argv[1:4]
REPLACED = {"etc/hostname", "etc/hosts"}
DROPPED = {".dockerenv"} | REPLACED

with tarfile.open(src) as tin, tarfile.open(dst, "w", format=tarfile.PAX_FORMAT) as tout:
    for m in tin:
        if m.name.lstrip("./") in DROPPED:
            continue
        tout.addfile(m, tin.extractfile(m) if m.isreg() else None)
    for name in sorted(REPLACED):
        data = open(os.path.join(overlay, name), "rb").read()
        info = tarfile.TarInfo(name)
        info.size, info.mode, info.uid, info.gid = len(data), 0o644, 0, 0
        tout.addfile(info, io.BytesIO(data))
