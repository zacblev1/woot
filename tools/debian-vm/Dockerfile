# Slim, serial-console-only Debian (i386) for the in-browser v86 VM.
# i386 kernels were dropped in trixie, so this stays on bookworm (LTS to 2028).
FROM i386/debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# The slim image strips man pages/docs via dpkg path-excludes. We want `man`
# to work (it's a teaching box), so drop the excludes before installing.
RUN rm -f /etc/dpkg/dpkg.cfg.d/docker

RUN apt-get update && apt-get install -y --no-install-recommends \
      linux-image-686 systemd-sysv udev dbus locales \
      sudo bash-completion less man-db manpages \
      procps psmisc htop file tree bc \
      vim nano \
      python3 \
      gcc libc6-dev make \
      git \
      neofetch cowsay fortune-mod fortunes-min sl figlet toilet lolcat ncal \
      cmatrix bsdgames ninvaders moon-buggy bastet nsnake greed pacman4console \
    && rm -rf /var/lib/apt/lists/*

RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen && locale-gen && \
    echo 'LANG="en_US.UTF-8"' > /etc/default/locale

# Unprivileged user with passwordless sudo. Root is safe to hand out: the
# whole machine lives in the visitor's browser tab and resets on reload.
RUN useradd -m -s /bin/bash -G sudo visitor && passwd -d visitor && passwd -d root && \
    echo "visitor ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/visitor && \
    echo woot > /etc/hostname

# Auto-login on the serial console.
RUN mkdir -p /etc/systemd/system/serial-getty@ttyS0.service.d && \
    printf '%s\n' '[Service]' 'ExecStart=' \
      'ExecStart=-/sbin/agetty --autologin visitor --noissue --noclear -s %I 115200 xterm-256color' \
      > /etc/systemd/system/serial-getty@ttyS0.service.d/autologin.conf && \
    systemctl enable serial-getty@ttyS0.service && \
    systemctl mask console-getty.service

# Host <-> guest side channel on the second UART (ttyS1):
#  - woot-winsize: host sends "rows cols\n" on attach/resize; we apply it to
#    the console tty (the kernel then SIGWINCHes the foreground job).
#  - .bash_logout emits a private OSC (7337) the host's xterm treats as "exit".
COPY woot-winsize /usr/local/sbin/woot-winsize
COPY woot-winsize.service /etc/systemd/system/woot-winsize.service
RUN chmod 755 /usr/local/sbin/woot-winsize && systemctl enable woot-winsize.service && \
    printf '%s\n' "printf '\\033]7337;exit\\007'" >> /home/visitor/.bash_logout

# Trim boot: nothing here needs timers, networking, or a VT console.
RUN systemctl disable systemd-timesyncd.service apt-daily.timer apt-daily-upgrade.timer \
      man-db.timer e2scrub_all.timer fstrim.timer dpkg-db-backup.timer 2>/dev/null || true; \
    systemctl mask getty@tty1.service systemd-networkd.service systemd-resolved.service \
      systemd-logind.service 2>/dev/null || true

# Boot from the 9p root filesystem v86 serves (lazy, per-file fetch).
RUN printf '%s\n' 9p 9pnet 9pnet_virtio virtio virtio_ring virtio_pci >> /etc/initramfs-tools/modules && \
    printf '%s\n' \
      '#!/bin/sh' \
      'case $1 in prereqs) exit 0;; esac' \
      '. /scripts/functions' \
      'mkdir -p ${rootmnt}' \
      'mount -n -t 9p -o trans=virtio,version=9p2000.L,cache=loose,rw host9p ${rootmnt}' \
      > /etc/initramfs-tools/scripts/boot-9p && \
    chmod +x /etc/initramfs-tools/scripts/boot-9p && \
    echo 'BOOT=boot-9p' >> /etc/initramfs-tools/initramfs.conf && \
    update-initramfs -u

# Easter eggs, toys, the treasure hunt and the hamster (see fun/ and README.md).
COPY fun/ /tmp/fun/
RUN set -e; F=/tmp/fun; \
    install -m 755 "$F"/bin/* /usr/local/bin/; \
    ln -s /usr/bin/cmatrix /usr/local/bin/matrix; \
    install -d /usr/local/lib/woot; ln -s /bin/sleep /usr/local/lib/woot/hamster-wheel; \
    install -m 755 "$F"/hamster/hamster-wheel "$F"/hamster/hamster-died /usr/local/sbin/; \
    install -m 644 "$F"/hamster/hamster.service /etc/systemd/system/; \
    systemctl enable hamster.service; \
    cat "$F"/bash.bashrc.snippet >> /etc/bash.bashrc; \
    install -m 644 "$F"/fortunes/woot /usr/share/games/fortunes/woot; \
    strfile -s /usr/share/games/fortunes/woot; \
    cp -a "$F"/home/. /home/visitor/; \
    base64 "$F"/build/clue2.txt > /home/visitor/.treasure/clue2.b64; \
    ln -s /home/zachary /home/visitor/portfolio; \
    chown -R visitor:visitor /home/visitor; \
    python3 "$F"/build/make-haystack.py /usr/share/woot/haystack "$F"/build/needle.txt 1000; \
    cp -a "$F"/museum /opt/museum; chown -R root:root /opt/museum; \
    install -d -m 700 /opt/museum/basement/old-vault; \
    install -m 644 "$F"/vault/* /opt/museum/basement/old-vault/; \
    install -m 644 "$F"/root/README.txt /root/README.txt; \
    rm -rf "$F"

COPY motd /etc/motd
# Signal the state builder once a shell is up (consumed by build-state.mjs).
RUN echo '[ -f /tmp/.booted ] || { touch /tmp/.booted; echo "__WOOT_READY__"; }' >> /home/visitor/.bashrc

WORKDIR /home/visitor
