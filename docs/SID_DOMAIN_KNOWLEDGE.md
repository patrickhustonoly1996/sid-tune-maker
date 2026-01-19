# SID Chip Domain Knowledge

Reference for building the SID emulator. Read this before asking music/synthesis questions.

## What is the SID?

The **SID** (Sound Interface Device) is the audio chip in the Commodore 64 computer (1982). Chip numbers: MOS 6581 (original) and 8580 (later revision).

It defined the sound of 8-bit gaming and demo scenes. Still beloved today.

## SID Architecture

### 3 Voices

The SID has exactly **3 independent voices** (oscillators). Each can play one note at a time.

Each voice has:
- Oscillator (generates the waveform)
- ADSR envelope (shapes volume over time)
- Access to the shared filter

### Waveforms (Per Voice)

Each oscillator can produce one of 4 waveforms:

| Waveform  | Sound Character                    | Use Case              |
|-----------|------------------------------------|-----------------------|
| Pulse     | Hollow, buzzy. Width changes tone  | Bass, leads, PWM pads |
| Sawtooth  | Bright, rich harmonics             | Leads, brass sounds   |
| Triangle  | Soft, mellow, few harmonics        | Soft pads, flutes     |
| Noise     | White noise, random                | Drums, FX, texture    |

**Pulse Width:** The pulse wave has adjustable duty cycle (0-100%). 50% = square wave. Lower values = thinner, more nasal. Sweep the width for PWM effects.

**Combined waveforms:** The real SID can combine waveforms (AND logic), creating weird hybrid sounds. This is a lo-fi trick.

### ADSR Envelope

Each voice has an **ADSR envelope** controlling volume over time:

```
Volume
  │      /\
  │     /  \____
  │    /        \
  │   /          \
  └──┴───────────┴──► Time
     A  D   S    R
```

- **Attack (A):** Time to reach full volume (0-2 sec)
- **Decay (D):** Time to drop to sustain level (0-2 sec)
- **Sustain (S):** Volume level while key held (0-100%)
- **Release (R):** Time to fade to zero after key released (0-2 sec)

Fast attack = percussive. Slow attack = swelling pad.

### Filter (Shared)

One multimode filter shared by all 3 voices. Each voice can be routed through it or bypass it.

Filter modes:
- **Low-pass:** Removes highs. Warm, muffled.
- **Band-pass:** Removes highs and lows. Nasal, focused.
- **High-pass:** Removes lows. Thin, bright.

Parameters:
- **Cutoff frequency:** What frequencies to affect
- **Resonance:** Boost at cutoff. Higher = more pronounced, squelchy

Sweeping the filter cutoff is THE classic SID sound.

### Ring Modulation

Voice 3 can modulate voice 1. Voice 1 can modulate voice 2.

Ring mod multiplies two signals, creating metallic, bell-like, or harsh tones. Good for FX and unusual timbres.

### Oscillator Sync

Hard sync locks one oscillator's phase to another. Creates aggressive, harmonically rich sounds. Classic for screaming leads.

## Frequency Range

- **Note range:** C0 to B7 (16 Hz to 3951 Hz approximately)
- **The SID can go lower** with tricks but standard range covers musical needs

## SID Quirks

Real SID chips have character:

- **6581:** Darker filter, more bass, slightly distorted. Preferred by purists.
- **8580:** Cleaner filter, brighter. More accurate but less "warm."

We'll emulate 6581 character by default.

## Common SID Techniques

### PWM Bass
Pulse wave with width modulated by LFO. Creates thick, moving bass.

### Arpeggio
Rapidly cycling through chord notes on one voice. Sounds like multiple notes.

### Filter Sweep
Automate cutoff over time. Instant 80s.

### Combined Waveforms
Pulse + Saw = gritty hybrid. Use sparingly.

### Drum Sounds
- **Kick:** Triangle with fast pitch decay + noise
- **Snare:** Noise with medium decay
- **Hi-hat:** High-pitched noise, short decay

## Tempo & Timing

C64 ran at ~50Hz (PAL) or ~60Hz (NTSC). Music often synced to frame rate.

Typical tempo: 100-150 BPM

We're not bound by this—use standard BPM.

## Reference Tracks

Classic SID music to study:
- **Martin Galway:** Ocean Loader, Wizball
- **Rob Hubbard:** Monty on the Run, Commando
- **Jeroen Tel:** Cybernoid, Turbo Outrun
- **Ben Daglish:** The Last Ninja

Listen on: HVSC (High Voltage SID Collection) - thousands of .sid files.

## Web Audio Equivalents

| SID Feature    | Web Audio Implementation           |
|----------------|-------------------------------------|
| Oscillator     | OscillatorNode                      |
| Pulse width    | Custom PeriodicWave or AudioWorklet |
| Filter         | BiquadFilterNode                    |
| ADSR           | GainNode with scheduled automation  |
| Ring mod       | GainNode with oscillator multiplier |
| Noise          | AudioBuffer with random samples     |

## Glossary

- **Voice:** One sound generator (oscillator + envelope)
- **Oscillator:** Generates raw waveform
- **Envelope:** Shapes volume/filter over time
- **LFO:** Low Frequency Oscillator - modulates other parameters
- **PWM:** Pulse Width Modulation
- **Cutoff:** Filter frequency threshold
- **Resonance:** Filter emphasis at cutoff
- **Portamento:** Pitch slide between notes
- **Arpeggio:** Rapid note cycling
