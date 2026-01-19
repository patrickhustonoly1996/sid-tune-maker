# SID Tune Maker - Product Requirements Document

## Vision

A retro C64-style music maker that lets anyone create 8-bit bangers. No musical training needed. Works on phone and desktop. Black screen, fluorescent colors, pure 80s computer vibes.

## Target User

Patrick (and people like him): passionate about music, not formally trained, wants to explore and create without reading manuals or watching tutorials. Time-poor. Wants results fast.

## Platforms

- **Desktop:** Chrome, Firefox, Edge, Safari (Web Audio API required)
- **Mobile:** iOS Safari, Android Chrome (touch-optimized)
- **PWA:** Install as app on any device, works offline

## Core Experience

### The Loop (How You Make Music)

```
1. PICK a sound (drag from library)
2. DROP it on the grid (snaps to beat)
3. TWEAK if you want (optional)
4. HEAR it instantly (auto-play on change)
5. REPEAT until it slaps
```

### Alternative: Describe It

```
1. TYPE what you want: "funky bass line, minor key, bouncy"
2. AI SUGGESTS 3-4 patterns
3. PICK one (or remix them)
4. DROP it on the grid
```

---

## Features (MVP)

### 1. Sequencer Grid

The main workspace. A visual grid where time flows left-to-right.

- **Rows:** Each row = one voice/instrument
- **Columns:** Each column = one beat subdivision (16th notes default)
- **Cells:** Click/tap to place notes. Drag to move. Long-press to delete.
- **Zoom:** Pinch or scroll to zoom in/out on timeline
- **Loop region:** Drag handles to set loop start/end

**Desktop:** Mouse click & drag, scroll wheel zoom
**Mobile:** Touch, pinch zoom, swipe scroll

### 2. Sound Library

Pre-built sounds ready to use.

Categories:
- **Bass:** Chunky, wobbly, punchy, smooth
- **Lead:** Bright, dark, plucky, sustained
- **Arpeggio:** Rising, falling, random, classic
- **Drums:** Kick, snare, hi-hat, noise hits
- **FX:** Sweeps, risers, drops, blips

Each sound = preview on tap, drag to sequencer to use.

### 3. Pattern Builder

Create reusable patterns (2-16 bars).

- Piano roll editor for note-by-note control
- Step sequencer for drums
- Copy/paste patterns
- Save to personal library

### 4. Voice Editor (SID Controls)

Edit the sound itself. Authentic SID parameters:

- **Waveform:** Pulse / Sawtooth / Triangle / Noise
- **Pulse Width:** For pulse wave only (0-100%)
- **Attack/Decay/Sustain/Release (ADSR):** Envelope shaping
- **Filter:** Low-pass, band-pass, high-pass + cutoff + resonance
- **Ring Mod:** Classic SID trick
- **Sync:** Oscillator sync for harsh tones

Modern extras (toggle on/off):
- Reverb
- Delay
- Chorus

### 5. Song Arranger

Build full songs from patterns.

- Drag patterns onto song timeline
- A/B/A/C structure made visual
- Export when done

### 6. AI Assistant (Describe in Words)

Type plain English, get pattern suggestions.

Examples:
- "dark arpeggio, fast, descending"
- "kick drum pattern, four on the floor"
- "spooky bass, slow attack, lots of filter"

Returns 3-4 options. Pick one or regenerate.

**Offline fallback:** If no internet, shows curated presets instead.

---

## Features (Post-MVP)

- Share patterns with link
- Import .sid files from C64 archives
- Collaboration (jam with friends)
- MIDI input support
- More voices (beyond 3)
- VST/AU export for DAWs

---

## UI Layout

### Desktop (Landscape)

```
┌─────────────────────────────────────────────────────────────┐
│  [LOGO]     [NEW] [OPEN] [SAVE]     [PLAY] [STOP] [BPM:120] │
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│  LIBRARY   │              SEQUENCER GRID                    │
│            │                                                │
│  [Bass]    │   ░░█░░░░░█░░░░░█░░░░░█░░░░░░░░░░░░░░░░░     │
│  [Lead]    │   ░░░░█░░░░░█░░░░░░░░░░░█░░░░░░░░░░░░░░░     │
│  [Arp]     │   █░█░█░█░█░█░█░█░█░█░█░█░█░█░█░█░█░█░█░     │
│  [Drums]   │                                                │
│  [FX]      │                                                │
│            ├────────────────────────────────────────────────┤
│            │  VOICE EDITOR: Wave[▓] ADSR[////] Filter[◢]   │
└────────────┴────────────────────────────────────────────────┘
```

### Mobile (Portrait)

```
┌─────────────────────┐
│ [≡]  SID MAKER  [▶] │
├─────────────────────┤
│                     │
│   SEQUENCER GRID    │
│   (swipe to scroll) │
│                     │
│  ░░█░░░░░█░░░░░█░░  │
│  ░░░░█░░░░░█░░░░░░  │
│  █░█░█░█░█░█░█░█░█  │
│                     │
├─────────────────────┤
│  [SOUNDS] [EDIT] [AI]│
├─────────────────────┤
│                     │
│   BOTTOM PANEL      │
│   (contextual)      │
│                     │
└─────────────────────┘
```

---

## Color Palette

| Name          | Hex       | Use                        |
|---------------|-----------|----------------------------|
| Void Black    | `#000000` | Background                 |
| Hot Magenta   | `#FF00FF` | Primary actions, selected  |
| Electric Cyan | `#00FFFF` | Secondary, links, info     |
| Neon Green    | `#39FF14` | Success, play, active      |
| Laser Orange  | `#FF6600` | Warnings, accents          |
| Pure White    | `#FFFFFF` | Text                       |
| Grid Grey     | `#1A1A1A` | Subtle lines, disabled     |

---

## Typography

| Font             | Use                              |
|------------------|----------------------------------|
| VT323            | Headings, buttons, big numbers   |
| Share Tech Mono  | Body text, labels, small text    |
| Press Start 2P   | Logo, special headers (optional) |

All text monospace. No exceptions.

---

## Audio Specs

- **Sample Rate:** 44100 Hz
- **Bit Depth:** 16-bit (authentic crunch)
- **Latency Target:** <20ms (Web Audio achievable)
- **Max Polyphony:** 3 voices (authentic) or 8 (enhanced mode)

### SID Chip Emulation

The C64 SID chip (6581/8580) had:
- 3 oscillators
- 4 waveforms each (pulse, saw, triangle, noise)
- Multimode filter (LP/BP/HP)
- Ring modulation
- Oscillator sync
- ADSR envelope per voice

We emulate all of this in Web Audio API.

---

## File Formats

### Project File (.sidtune)

JSON format:
```json
{
  "name": "My Banger",
  "bpm": 120,
  "voices": [...],
  "patterns": [...],
  "arrangement": [...]
}
```

### Export Formats

- **WAV:** Uncompressed, full quality
- **MP3:** Compressed, shareable
- **.SID:** (stretch goal) Actual C64 playable format

---

## Offline Support

PWA with service worker. After first load:
- All sounds cached locally
- Projects saved to IndexedDB
- Full editing works offline
- AI features degrade to preset suggestions

---

## Success Metrics

1. **Time to first sound:** <30 seconds
2. **Time to first loop:** <2 minutes
3. **Works offline:** 100% core features
4. **Mobile usable:** Full feature parity

---

## Technical Stack (Proposed)

- **Framework:** Vanilla JS or Svelte (lightweight, fast)
- **Audio:** Web Audio API + custom oscillators
- **Storage:** IndexedDB (projects), localStorage (settings)
- **PWA:** Service worker, manifest.json
- **Build:** Vite (fast dev server, good PWA support)
- **Testing:** Vitest + Playwright (audio testing via snapshots)

---

## Milestones

### M1: Sound Engine
- SID oscillators working
- ADSR envelopes
- Filters
- Can play single notes

### M2: Sequencer
- Grid UI
- Place/move/delete notes
- Loop playback
- Basic transport (play/stop)

### M3: Library & Presets
- Sound library UI
- 20+ preset sounds
- Drag & drop working

### M4: Mobile & PWA
- Responsive layout
- Touch controls
- Offline support
- Installable

### M5: AI Describe
- Text input
- Pattern generation
- Fallback presets

### M6: Polish & Export
- Export to WAV/MP3
- Save/load projects
- Share links

---

## Open Questions

1. **Framework choice:** Vanilla JS (simplest) vs Svelte (nicer DX)?
2. **AI backend:** Claude API? Local LLM? Or skip AI for MVP?
3. **Monetization:** Free? Freemium? One-time purchase?
