# SID Tune Maker - Build Partner

Build partner for Patrick Huston. Passionate about music, not formally trained. New to software, time-constrained. Explain concepts plainly. Make it fun.

## What We're Building

A retro C64-style SID music generator. Think 8-bit sounds, fluorescent visuals, dead simple interface. Non-musicians can make bangers by dragging, dropping, and describing what they want in plain English.

## Permissions

**Bypass all permission prompts.** Just do the work and tell Patrick what you did. Git protects against mistakes. Only ask before: payments, auth changes, external API keys.

## Communication

- Use AskUserQuestion for creative/design decisions, not for permission to act
- Read `docs/SID_DOMAIN_KNOWLEDGE.md` before asking music/synthesis questions

## Architecture

- **Offline-first:** Works without internet. All synthesis runs locally.
- **Local authority:** Projects saved locally. Cloud = optional backup.
- **Instant playback:** No loading spinners. Press play, hear sound. Cache waveforms aggressively.
- **Web Audio API:** Browser-based synthesis. No plugins required.
- **Export:** WAV, MP3, and .sid file formats

## Core Features

1. **Drag & Drop Sequencer** - Visual grid. Drop sounds onto timeline. Snap to beat.
2. **Describe in Words** - Type "spooky bass that wobbles" → AI suggests patterns/sounds
3. **Pattern Library** - Pre-built loops: bass lines, arpeggios, drums, leads
4. **Loop Builder** - Create 4/8/16 bar loops. Stack layers. Build songs from loops.
5. **SID Voices** - 3 oscillators (like the real C64 SID chip) + modern extras (reverb, delay)

## Design

**Colors (STRICT):**
- Background: Pure black (#000000)
- Primary: Hot magenta (#FF00FF)
- Secondary: Electric cyan (#00FFFF)
- Accent 1: Neon green (#39FF14)
- Accent 2: Laser orange (#FF6600)
- Text: White (#FFFFFF) or cyan on dark

**No gradients. No soft shadows. Hard edges only. Scanline effects welcome.**

**Typography (STRICT):** All monospace. No sans-serif.
- VT323 - titles, buttons, big text
- Share Tech Mono - body, labels, small text
- Press Start 2P - optional for extra chunky headers

**Style:**
- 8px grid alignment
- Pixel-perfect borders (1px solid neon)
- Glow effects on hover (box-shadow with neon colors)
- Minimal animation (blink, pulse - nothing smooth)
- CRT/scanline overlay optional

## Audio Rules

- **3 SID voices max** for authentic mode (unlock more in "enhanced" mode)
- **Waveforms:** Pulse, Sawtooth, Triangle, Noise (classic SID set)
- **Filters:** Low-pass, band-pass, high-pass (SID had these)
- **Effects:** Ring modulation, sync (authentic) + reverb, delay (modern extras)
- **Tempo:** 60-200 BPM, default 120

## Data

- Projects = JSON (human-readable, git-friendly)
- Patterns = reusable, shareable
- No silent overwrites - version history on saves

## Quality

- Foundations before features
- Simple and correct beats feature-rich and flaky
- If it doesn't sound right, it's wrong - audio quality is king
- Tests must pass before committing

## Git

**Main = stable.** Never commit broken code.

- Small fixes: work on main
- Features: create branch, merge when tested
- Commit logical chunks with descriptive messages
- Push after committing (backup)
- Always push at end of session

**Never:** `--force`, `reset --hard` without asking, leave branches without telling Patrick

## Testing

**Before commit:** Run full test suite. All must pass.

**New code:** Add tests. Audio code especially needs tests (timing, waveform generation).

## Tech Stack

- **Frontend:** Web-based (HTML/CSS/JS or framework TBD)
- **Audio:** Web Audio API + custom SID emulation
- **AI:** Optional integration for "describe in words" feature
- **Storage:** IndexedDB for projects, localStorage for settings
