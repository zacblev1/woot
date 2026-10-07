# Debian VM image

Builds the real Debian 12 (i386) machine behind the terminal's `debian`
command. It runs in the visitor's browser under [v86](https://github.com/copy/v86):
the server only serves static files, and the guest has no network card.
Design and rationale: `docs/superpowers/specs/2026-10-07-debian-vm-design.md`.

## Build

```bash
tools/debian-vm/build.sh            # -> public/vm/  (or: build.sh /some/out/dir)
```

Needs docker (linux/386 runs natively on x86_64), node and zstd. The run takes
about 15 minutes, mostly compressing ~17k files. Steps:

1. `docker build` of `Dockerfile`: slim bookworm i386, serial console only,
   `visitor` with passwordless sudo, boots from v86's 9p filesystem.
2. `docker export` → `fix-rootfs.py` (drops `/.dockerenv`, which would make
   systemd act like it's in a container, and the hostname/hosts placeholders).
3. v86's `fs2json.py` + `copy-to-sha256.py` produce the lazy-loaded filesystem:
   one `.zst` per file, fetched only when the guest opens it.
4. `build-state.mjs` boots it headlessly in Node, waits for the shell, and saves
   a snapshot, so browsers resume in under a second instead of booting.
5. Assembles the output: `libv86.js`, `v86.wasm`, BIOS, fs index and snapshot,
   all content-hashed, plus `manifest.json` naming them.

Emulator JS, wasm, BIOS and snapshot ship together from the same pinned v86
(`package.json` here, plus the `V86_COMMIT` files in `build.sh`). A snapshot
only restores on the v86 build that created it, so the app never bundles v86
itself. To bump v86, change both pins and rebuild.

## Deploy

The output is ~305 MB, so it is not in git or the app's Docker image
(`.gitignore`/`.dockerignore` exclude `public/vm`). Mount it read-only:

```bash
# homelab: services/woot/docker-compose.yml mounts ~/homelab/data/woot-vm here
docker run ... -v /path/to/vm:/app/public/vm:ro woot
```

`build.sh` assembles into `<out>.new` and swaps it in at the end. Restart the
app afterwards (safest, since Next.js serves `public/` from its startup
state). `next.config.mjs` serves `/vm/*` as immutable,
except `manifest.json` which is `no-cache`, so a rebuild takes effect on the
next visit. Without the volume, `debian` says the image isn't installed and
the rest of the site is unaffected.

## Verify

```bash
docker run --rm --network host --ipc=host -u "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD/tools/debian-vm:/t" -w /t mcr.microsoft.com/playwright:v1.63.0-noble \
  sh -c 'npm ci --silent && node probe.mjs http://127.0.0.1:3000 /t/.work/probe.png'
```

This checks: real kernel with systemd as PID 1, no NIC, terminal size
propagation, portfolio files in `/home/zachary`, python3, sudo, Ctrl+] back
to the portfolio, and no requests leaving the site's origin.

## Changing what's installed

Edit the package list in `Dockerfile` and rebuild. Unused packages cost server
disk only, not visitor downloads (the files are lazy-loaded). The guest helpers
are `woot-winsize` (applies host terminal size from ttyS1) and the OSC 7337 line
in `~visitor/.bash_logout` (tells the host the session ended).

## Easter eggs (`fun/`) — spoilers

Installed by the `fun/` layer in the `Dockerfile`, so the first `ls` isn't empty
and there's plenty to find:

| What | Where |
|---|---|
| Starter files: `README.txt` (hints), `hello.c`, `hello.py`, `DO_NOT_OPEN.txt`, `portfolio` → `/home/zachary` | `fun/home/` → `~visitor` |
| `make me a sandwich` / `sudo make me a sandwich` (xkcd 149) | `fun/home/Makefile` |
| Treasure hunt, one Linux skill per step: `ls -a` → `base64 -d` → `grep -r` (1000-file haystack) → `find` → `sudo` (root-only vault) → `gcc` (answer: 42) | `fun/home/.treasure/`, `fun/build/` (clue 2, needle, haystack generator), `fun/vault/` → `/opt/museum/basement/old-vault/` |
| Museum to wander: `/opt/museum` | `fun/museum/` |
| Toys: `hack`, `selfdestruct`, `party`, `magic8`, `coffee` (418), `arcade`, `matrix` | `fun/bin/` → `/usr/local/bin` |
| Games: pacman4console, nsnake, ninvaders, bastet, moon-buggy, greed, bsdgames (adventure, wump, robots, worm, hangman…) | Debian packages |
| Shell responses: `xyzzy`, `plugh`, `moo`, `hi`, `cd..`, `ping`, `google`, `please`; `apt install` explains there's no internet (`apt moo` still works) | `fun/bash.bashrc.snippet` → `/etc/bash.bashrc` |
| Custom fortunes (CS jokes and facts) | `fun/fortunes/woot` |
| The hamster: `ps aux` shows `hamster-wheel (powers this computer -- please do not kill)`. Killing it prints a lament on the console, and systemd hires a new one 6 s later | `fun/hamster/` |
| A note for anyone who gets into `/root` | `fun/root/README.txt` |

`probe.mjs` checks the starter files, the sandwich, a full scripted solve of the
treasure hunt, `hack`, and the hamster's death and rebirth.
