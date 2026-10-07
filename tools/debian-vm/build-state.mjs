#!/usr/bin/env node
// Boot the 9p Debian image headlessly, wait for the auto-login shell, then
// snapshot the machine so browsers resume instead of booting.
// usage: node build-state.mjs <v86-pkg-dir> <bios-dir> <fs-dir> <memory-mb>
// Reads <fs-dir>/debian-base-fs.json + flat/, writes <fs-dir>/debian-state.bin.zst
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const [pkgDir, biosDir, outDir, memMb = "256"] = process.argv.slice(2);
const { V86 } = await import(path.join(pkgDir, "build/libv86.mjs"));

const emulator = new V86({
    wasm_path: path.join(pkgDir, "build/v86.wasm"),
    bios: { url: path.join(biosDir, "seabios.bin") },
    vga_bios: { url: path.join(biosDir, "vgabios.bin") },
    autostart: true,
    memory_size: Number(memMb) * 1024 * 1024,
    vga_memory_size: 2 * 1024 * 1024,
    bzimage_initrd_from_filesystem: true,
    // init_on_free zeroes freed pages so the snapshot compresses well.
    cmdline: "rw init=/bin/systemd root=host9p console=ttyS0 spectre_v2=off pti=off init_on_free=on quiet",
    filesystem: {
        basefs: { url: path.join(outDir, "debian-base-fs.json") },
        baseurl: path.join(outDir, "flat") + "/",
    },
    screen_dummy: true,
    // ttyS1 carries terminal-size updates (see woot-winsize). Device layout
    // must match the page config, since the snapshot records it.
    uart1: true,
    // No NIC at all (v86 defaults to an ne2k). Must match the page config,
    // since the snapshot records the device layout.
    net_device: { type: "none" },
});

const start = Date.now();
let text = "";
let phase = "boot";
const timeout = setTimeout(() => { console.error("\nTIMEOUT"); process.exit(1); }, 15 * 60 * 1000);

emulator.add_listener("serial0-output-byte", (byte) => {
    const c = String.fromCharCode(byte);
    process.stdout.write(c);
    text += c;
    if (phase === "boot" && text.includes("__WOOT_READY__")) {
        phase = "settle";
        console.error(`\n[booted in ${(Date.now() - start) / 1000}s]`);
        // Remove the boot marker, quiet the kernel, flush, drop page cache
        // (smaller snapshot), then clear so restored sessions open on the motd.
        emulator.serial0_send("sed -i '/__WOOT_READY__/d' ~/.bashrc; history -c; sudo dmesg -n 1; sync; echo 3 | sudo tee /proc/sys/vm/drop_caches >/dev/null; clear; cat /etc/motd\n");
        setTimeout(save, 5000);
    }
});

async function save() {
    const state = new Uint8Array(await emulator.save_state());
    const out = path.join(outDir, "debian-state.bin");
    fs.writeFileSync(out, state);
    execFileSync("zstd", ["-19", "-T0", "-q", "-f", out, "-o", out + ".zst"]);
    console.error(`[state ${(state.length / 1e6).toFixed(1)}MB raw, ${(fs.statSync(out + ".zst").size / 1e6).toFixed(1)}MB zstd]`);
    clearTimeout(timeout);
    emulator.destroy();
    process.exit(0);
}
