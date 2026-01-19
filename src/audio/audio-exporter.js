/**
 * Audio Exporter - Renders tunes to downloadable audio files
 * Uses OfflineAudioContext for high-quality offline rendering
 */

import { NOTE_FREQUENCIES } from './sid-engine.js';

// MIDI note to frequency conversion
function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Note definitions (same as sequencer)
const NOTES = [
  { name: 'C5', midi: 72 },
  { name: 'B4', midi: 71 },
  { name: 'A#4', midi: 70 },
  { name: 'A4', midi: 69 },
  { name: 'G#4', midi: 68 },
  { name: 'G4', midi: 67 },
  { name: 'F#4', midi: 66 },
  { name: 'F4', midi: 65 },
  { name: 'E4', midi: 64 },
  { name: 'D#4', midi: 63 },
  { name: 'D4', midi: 62 },
  { name: 'C#4', midi: 61 },
  { name: 'C4', midi: 60 },
  { name: 'B3', midi: 59 },
  { name: 'A3', midi: 57 },
  { name: 'G3', midi: 55 },
];

export class AudioExporter {
  constructor() {
    this.sampleRate = 44100;
    this.isExporting = false;
    this.onProgress = null;
  }

  /**
   * Render a project to an audio buffer
   * @param {Object} project - Project data with grid, voices, bpm
   * @returns {Promise<AudioBuffer>}
   */
  async renderToBuffer(project) {
    const { grid, voices, bpm, filter } = project;

    // Calculate total duration
    const secondsPerBeat = 60 / bpm / 4; // 16th note duration
    const totalSteps = 64; // 4 bars
    const duration = totalSteps * secondsPerBeat + 1; // Add 1 second for release

    // Create offline audio context
    const offlineCtx = new OfflineAudioContext(2, this.sampleRate * duration, this.sampleRate);

    // Create master gain
    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(offlineCtx.destination);

    // Create shared filter
    const sharedFilter = offlineCtx.createBiquadFilter();
    sharedFilter.type = filter?.type || 'lowpass';
    const cutoff = filter?.cutoff ?? 80;
    sharedFilter.frequency.value = 20 * Math.pow(1000, cutoff / 100);
    sharedFilter.Q.value = 0.5 + ((filter?.resonance ?? 20) / 100) * 19.5;
    sharedFilter.connect(masterGain);

    // Schedule all notes for each voice
    for (let voiceIndex = 0; voiceIndex < 3; voiceIndex++) {
      const voiceParams = voices?.[voiceIndex] || {
        waveform: 'pulse',
        attack: 0.01,
        decay: 0.1,
        sustain: 0.7,
        release: 0.2
      };

      const voiceGrid = grid[voiceIndex];
      if (!voiceGrid) continue;

      // Process each note row
      for (let noteIndex = 0; noteIndex < voiceGrid.length; noteIndex++) {
        const noteRow = voiceGrid[noteIndex];
        if (!noteRow) continue;

        // Find notes in this row
        for (let step = 0; step < noteRow.length; step++) {
          const cell = noteRow[step];
          if (cell && (cell.length || cell === true)) {
            const noteLength = typeof cell === 'object' ? (cell.length || 1) : 1;
            const frequency = midiToFrequency(NOTES[noteIndex]?.midi || 60);
            const startTime = step * secondsPerBeat;
            const noteDuration = noteLength * secondsPerBeat;

            this.scheduleNote(offlineCtx, sharedFilter, frequency, startTime, noteDuration, voiceParams);
          }
        }
      }

      if (this.onProgress) {
        this.onProgress((voiceIndex + 1) / 3 * 0.5); // 50% for scheduling
      }
    }

    // Render
    const renderedBuffer = await offlineCtx.startRendering();

    if (this.onProgress) {
      this.onProgress(1); // 100%
    }

    return renderedBuffer;
  }

  /**
   * Schedule a single note
   */
  scheduleNote(ctx, outputNode, frequency, startTime, duration, params) {
    const { waveform, attack, decay, sustain, release } = params;

    // Create oscillator
    const osc = ctx.createOscillator();

    // Set waveform
    if (waveform === 'noise') {
      osc.type = 'square'; // Fallback for noise
    } else if (waveform === 'pulse') {
      osc.type = 'square';
    } else {
      osc.type = waveform;
    }

    osc.frequency.value = frequency;

    // Create envelope
    const envelope = ctx.createGain();
    envelope.gain.value = 0;

    // Connect
    osc.connect(envelope);
    envelope.connect(outputNode);

    // ADSR values come in as actual seconds/levels from engine
    // Provide sensible defaults
    const attackTime = attack || 0.01;
    const decayTime = decay || 0.1;
    const sustainLevel = sustain || 0.7;
    const releaseTime = release || 0.2;

    // Apply ADSR envelope
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(0.8, startTime + attackTime);
    envelope.gain.linearRampToValueAtTime(sustainLevel * 0.8, startTime + attackTime + decayTime);

    // Release
    const releaseStart = startTime + duration;
    envelope.gain.setValueAtTime(sustainLevel * 0.8, releaseStart);
    envelope.gain.linearRampToValueAtTime(0, releaseStart + releaseTime);

    // Start and stop
    osc.start(startTime);
    osc.stop(releaseStart + releaseTime + 0.1);
  }

  /**
   * Convert AudioBuffer to WAV blob
   */
  bufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;

    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, totalLength - 8, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Interleave channels and write samples
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = channels[ch][i];
        // Clamp
        sample = Math.max(-1, Math.min(1, sample));
        // Convert to 16-bit PCM
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Convert AudioBuffer to MP3 blob using lamejs
   */
  async bufferToMp3(buffer) {
    // Check if lamejs is loaded
    if (typeof lamejs === 'undefined') {
      throw new Error('MP3 encoder not loaded');
    }

    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const kbps = 128;

    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    const mp3Data = [];

    const sampleBlockSize = 1152;
    const leftData = buffer.getChannelData(0);
    const rightData = channels > 1 ? buffer.getChannelData(1) : leftData;

    // Convert float samples to int16
    const leftSamples = new Int16Array(leftData.length);
    const rightSamples = new Int16Array(rightData.length);

    for (let i = 0; i < leftData.length; i++) {
      leftSamples[i] = Math.max(-32768, Math.min(32767, Math.round(leftData[i] * 32767)));
      rightSamples[i] = Math.max(-32768, Math.min(32767, Math.round(rightData[i] * 32767)));
    }

    // Encode in blocks
    for (let i = 0; i < leftSamples.length; i += sampleBlockSize) {
      const leftChunk = leftSamples.subarray(i, i + sampleBlockSize);
      const rightChunk = rightSamples.subarray(i, i + sampleBlockSize);

      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    // Flush
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
  }

  /**
   * Export project to MP3 file
   */
  async exportMP3(project, filename) {
    if (this.isExporting) {
      throw new Error('Export already in progress');
    }

    this.isExporting = true;

    try {
      // Render to buffer
      const buffer = await this.renderToBuffer(project);

      // Convert to MP3
      const mp3Blob = await this.bufferToMp3(buffer);

      // Download
      this.downloadBlob(mp3Blob, filename || `${project.name || 'tune'}.mp3`);

      return mp3Blob;
    } finally {
      this.isExporting = false;
    }
  }

  /**
   * Export project to WAV file
   */
  async exportWAV(project, filename) {
    if (this.isExporting) {
      throw new Error('Export already in progress');
    }

    this.isExporting = true;

    try {
      // Render to buffer
      const buffer = await this.renderToBuffer(project);

      // Convert to WAV
      const wavBlob = this.bufferToWav(buffer);

      // Download
      this.downloadBlob(wavBlob, filename || `${project.name || 'tune'}.wav`);

      return wavBlob;
    } finally {
      this.isExporting = false;
    }
  }

  /**
   * Trigger file download
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/\s+/g, '-');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
