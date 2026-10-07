// End-to-end smoke test of the `debian` command in a real browser.
//
//   node probe.mjs <site-url> [screenshot.png]
//
// Run it in the Playwright image so nothing is installed on the host, e.g.:
//   docker run --rm --network host --ipc=host -u "$(id -u):$(id -g)" -e HOME=/tmp \
//     -v "$PWD/tools/debian-vm:/t" -w /t mcr.microsoft.com/playwright:v1.63.0-noble \
//     node probe.mjs http://127.0.0.1:3000 /t/.work/probe.png
import { chromium } from "playwright-core"

const [site, shot] = process.argv.slice(2)
const origin = new URL(site).origin
const browser = await chromium.launch()
// Reduced motion skips the first-visit boot animation.
const context = await browser.newContext({ viewport: { width: 1100, height: 750 }, reducedMotion: "reduce" })
const page = await context.newPage()
const cdp = await context.newCDPSession(page)
await cdp.send("Network.enable")
let bytes = 0
cdp.on("Network.loadingFinished", (e) => (bytes += e.encodedDataLength))
const foreign = []
page.on("request", (r) => {
  const u = r.url()
  if (!u.startsWith(origin) && !u.startsWith("blob:") && !u.startsWith("data:")) foreign.push(u)
})
page.on("pageerror", (e) => console.log("PAGEERROR", e.message))

const screenText = () => page.evaluate(() => document.querySelector(".xterm-rows")?.textContent ?? "")
const mb = () => `${(bytes / 1e6).toFixed(1)} MB`
let failures = 0
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`)
  if (!ok) failures++
}

async function waitText(re, ms) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    const t = await screenText()
    if (re.test(t)) return t
    await page.waitForTimeout(100)
  }
  throw new Error(`timeout waiting for ${re}; screen:\n${await screenText()}`)
}

// Each command prints a unique end marker so we can wait for completion.
let n = 0
async function sh(cmd, ms = 60000) {
  const tag = `@@${++n}@@`
  const t0 = Date.now()
  await page.keyboard.type(`${cmd}; echo ${tag.replace(/@@$/, "")}"@@"\n`)
  const text = await waitText(new RegExp(tag), ms)
  const body = text.slice(0, text.lastIndexOf(tag))
  return { out: body.slice(body.lastIndexOf(cmd.slice(0, 20))), ms: Date.now() - t0 }
}

const t0 = Date.now()
await page.goto(`${site}/?cmd=debian`)
await waitText(/visitor@woot/, 120000)
await page.waitForTimeout(500)
console.log(`prompt after ${Date.now() - t0} ms, ${mb()} downloaded`)
await page.locator(".xterm").click()
// From here on, every request is the VM session's (the page itself loads analytics).
foreign.length = 0

let r = await sh("uname -srm; ps -p 1 -o comm=")
check("real kernel, systemd is PID 1", /Linux 6\.\d.*i686/.test(r.out) && /systemd/.test(r.out))
r = await sh("ls /sys/class/net | tr '\\n' ' '")
check("no network card (only lo)", /\blo\b/.test(r.out) && !/enp|eth/.test(r.out), r.out.split("\n").pop())
r = await sh("echo COLS=$(tput cols)")
const guestCols = Number(/COLS=(\d+)/.exec(r.out)?.[1] ?? 0)
check("terminal size reached the guest (not the default 80)", guestCols > 80, `cols=${guestCols}`)
r = await sh("ls /home/zachary")
check("portfolio mirrored into /home/zachary", /books/.test(r.out) && /notes/.test(r.out))
r = await sh("python3 -c 'print(2**64)'")
check("python3", /18446744073709551616/.test(r.out), `${r.ms} ms`)
r = await sh("sudo whoami")
check("sudo works", /\broot\b/.test(r.out))
// Job control: Ctrl+C interrupts the foreground job (needs a real tty getty).
await page.keyboard.type("sleep 300\n")
await page.waitForTimeout(500)
await page.keyboard.press("Control+C")
r = await sh("echo after-interrupt", 10000)
check("Ctrl+C interrupts a foreground job", /after-interrupt/.test(r.out))
// Full-screen app: vim draws, and :q! leaves it.
await page.keyboard.type("vim /home/zachary/style/theme\n")
const vimScreen = await waitText(/"\/home\/zachary\/style\/theme"/, 30000).catch(async () => {
  console.log("vim screen was:\n" + (await screenText()).slice(-400))
  return ""
})
await page.keyboard.type(":q!\n")
// vim drops typeahead when it exits, so wait for the shell before typing on.
await page.waitForTimeout(1500)
r = await sh("echo vim-closed", 10000)
check("vim opens and quits", vimScreen !== "" && /vim-closed/.test(r.out))
// Easter eggs (fun/): the home folder isn't empty, the hunt is solvable, the hamster lives.
// (find exits 1 on the locked vault by design, hence `| head -1` in the hunt.)
r = await sh("ls")
check("home folder has the starter files", /README\.txt/.test(r.out) && /portfolio/.test(r.out))
r = await sh("make me a sandwich; sudo make me a sandwich | head -1")
check("make me a sandwich (xkcd 149)", /Make it yourself/.test(r.out) && /Okay\./.test(r.out))
r = await sh(
  "cd ~/.treasure && base64 -d clue2.b64 | grep -q NEEDLE && grep -rl NEEDLE /usr/share/woot/haystack | xargs grep -q vault" +
    " && V=$(find /opt -name '*vault*' 2>/dev/null | head -1) && sudo cp $V/vault.c ~/ && cd ~ && gcc vault.c -o vault && echo 42 | ./vault | grep 'VAULT IS OPEN'",
  120000
)
check("treasure hunt solvable end to end", /THE VAULT IS OPEN\s*\*\*\*/.test(r.out), `${r.ms} ms`)
r = await sh("hack >/dev/null; echo hack-exit=$?", 60000)
check("hack runs", /hack-exit=0/.test(r.out))
await page.keyboard.type("pkill hamster-wheel\n")
let hamster = await waitText(/You killed the hamster/, 15000).then(() => true, () => false)
hamster = hamster && (await waitText(/new hamster has been hired/, 20000).then(() => true, () => false))
check("killing the hamster is noticed, and it comes back", hamster)
if (shot) await page.screenshot({ path: shot })

await page.keyboard.press("Control+BracketRight")
await page.waitForTimeout(500)
check("Ctrl+] returns to the portfolio terminal", (await page.locator(".xterm").count()) === 0)
// Re-enter from the portfolio prompt, then leave via the guest's logout signal.
await page.keyboard.type("debian\n")
await waitText(/visitor@woot/, 60000)
await page.waitForTimeout(500)
await page.locator(".xterm").click()
await page.keyboard.type("exit\n")
await page.waitForTimeout(1000)
check("`exit` in the guest returns to the portfolio terminal", (await page.locator(".xterm").count()) === 0)
check("VM session made no requests off this origin", foreign.length === 0, foreign.join(", "))
console.log(`total downloaded: ${mb()}`)
await browser.close()
process.exit(failures ? 1 : 0)
