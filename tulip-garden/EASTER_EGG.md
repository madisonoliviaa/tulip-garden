# Tulip Garden — Easter Egg Design Plan

> Inspired by Rogue (1980) · The Amulet of Yendor

--- Subject to change / be edited until final version--- also later we will be converting the website backend to rust!

## The Reward

First person to inscribe the correct tulip wins:

- Permanent **gold crown** `♛` tulip rendered in the garden
- Special **FOUNDER OF YENDOR** badge, forever on-chain
- **One week ad slot** on the website

---

## The Solution

The winner must inscribe a tulip with **exactly** these four metadata fields:

```json
{
  "collection": "Tulip Garden",
  "artist": "rodney",
  "color": "#efface",
  "epitaph": "my name is yendor"
}
```

### Why these values?

- `artist: "rodney"` — Rodney is the player character in Rogue. Rodney backwards = Yendor (as in the Amulet of Yendor)
- `color: "#efface"` — derived from the Linux reboot puzzle (see below). "Efface" means to erase/fade away — epitaph-coded. Also valid hex color (soft lavender)
- `epitaph: "my name is yendor"` — the reveal. Rodney's true name

---

## The Clue Chain

### CLUE 1 — Website Source Code

Hidden HTML comment in the website:

```html
<!-- 0xFEE1DEAD -->
```

Looks like leftover debug code. A curious developer inspects source and finds it.

**Action:** Google `0xFEE1DEAD`
**Discovery:** It's the Linux reboot() magic value — "Feel Dead" in hexspeak. Required to reboot the kernel.

---

### CLUE 2 — THE MACHINE (Linux Terminal Emulator)

The tulip workshop is called **THE MACHINE**.

It emulates a Linux terminal. The user must:

1. Log in as root first:

```
tulip-garden login: root
Password:
```

- If they try to run anything without root → `Permission denied. Must be root to reboot.`
- Correct login triggers root shell: `root@tulip-garden:~#`

2. Run the actual Linux reboot syscall with correct params:

```c
reboot(0xFEE1DEAD, 0x28121969, LINUX_REBOOT_CMD_RESTART, 0x74756c6970)
```

**The four params:**
| Param | Value | How to find it |
|-------|-------|----------------|
| magic | `0xFEE1DEAD` | From source code comment |
| magic2 | `0x28121969` | Linus Torvalds' birthday (28/12/1969) — convert via `printf "%x\n" 672274793` |
| cmd | `LINUX_REBOOT_CMD_RESTART` | From reading the Linux man page |
| arg | `0x74756c6970` | `printf "%x\n" 499644141936` → `74756c6970` → "tulip" |

**Getting magic2:** The man page lists decimal `672274793` as MAGIC2. Running `printf "%x\n" 672274793` reveals `28121969` — December 28, 1969 — Linus Torvalds' birthday.

**Getting arg:** Hidden clue points to parent tx data on mempool.space. Solver must find the right byte sequence, run `printf "%x\n"` conversion → spells "tulip"

---

### CLUE 3 — Kernel Panic Screen

When the correct reboot command is entered, THE MACHINE glitches:

```
KERNEL PANIC — not syncing
magic value accepted: 0xFEE1DEAD
magic2 verified: 0x28121969
CR0: 0x4B1D
process: tulip (pid: 0)
...
...
memory fault at 0xefface
system halted.
awaiting reboot.
```

- `CR0: 0x4B1D` — "forbid" in hexspeak. Flavor text, atmosphere.
- `process: tulip (pid: 0)` — pid 0 = kernel root process. The tulip IS the root.
- `memory fault at 0xefface` — THIS is the color. `#efface`.

**Action:** Google `0xefface`
**Discovery:** Valid hex color (soft lavender). Also means "to erase, to fade away."

---

### CLUE 4 — Parent TX on mempool.space

Solver goes to mempool.space and looks up the parent inscription tx:

```
aa212d7e129acae38ede26ed03aea3bee360a407ac8f1ed1849678ffda48fa52
```

In the witness/metadata data they find a field:

```
"efface": "726f646e6579"
```

**Action:** Decode hex `726f646e6579` → `rodney`
**Discovery:** That's the artist name.

---

### CLUE 5 — Reverse It

`rodney` backwards = `yendor`

The Amulet of **Yendor** — the ultimate goal of Rogue (1980).
"Yendor" is "Rodney" spelled backwards — a reference hidden in the original game by its creators.

The epitaph writes itself: `"my name is yendor"`

---

## Hidden Details & Atmosphere

### Source code comments (in order of placement):

```html
<!-- 0xFEE1DEAD -->
<!-- printf "%x\n" -->
```

### Kernel panic includes flavor line:

```
CR0: 0x4B1D
```

`0x4B1D` = "forbid" — the forbidden control register password. Not required for the solution, pure atmosphere for deep nerds.

### pid: 0 meaning:

`process: tulip (pid: 0)` — pid 0 is the kernel itself, the root of everything. Parallel to `@` being the root inscription of the garden.

### The `efface` field name does triple duty:

1. Valid hexspeak
2. Means "to erase/fade" — epitaph-coded
3. IS the hex color `#efface`

---

## Website Detection Logic

When a new child inscription is fetched, check:

```typescript
const isEasterEgg =
  tulip.artist === "rodney" &&
  tulip.color === "#efface" &&
  tulip.epitaph === "my name is yendor";

if (isEasterEgg) {
  // render gold crown tulip
  // show FOUNDER OF YENDOR badge
  // special tombstone frame
}
```

---

## On-Chain Easter Egg Data

Add to parent inscription metadata (hidden in plain sight on mempool.space):

```json
"efface": "726f646e6579"
```

`726f646e6579` decodes to `rodney`.

---

## The Prize Tulip Render

- Color: `#FFD700` (gold) — overrides `#efface` on render for the winner
- Crown: `♛` above the tulip art
- Special tombstone ASCII frame
- Badge: `FOUNDER OF YENDOR`
- Permanent, on Bitcoin, forever

---

## Notes

- All other tulips without `color` field → color derived from `inscriptionId.slice(0,6)` as hex
- All other tulips with `color` field → use their chosen color
- Easter egg tulip → forced gold on render regardless of color field
- Timeline mode: tulips fade in white → bloom into their color
- The `#efface` color is intentionally beautiful (soft lavender) so even if someone guesses it randomly, the epitaph + artist fields make it near-impossible to complete accidentally
