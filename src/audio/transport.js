/**
 * Transport - Playback control and timing
 * Handles play/stop, BPM, loop regions, and sequencer scheduling
 */

export class Transport {
  constructor(engine, state) {
    this.engine = engine;
    this.state = state;

    this.isPlaying = false;
    this.bpm = state.bpm || 120;
    this.currentBeat = 0;
    this.loopStart = 1;
    this.loopEnd = 4;

    // Timing
    this.schedulerInterval = null;
    this.nextBeatTime = 0;
    this.scheduleAheadTime = 0.1; // seconds
    this.lookAhead = 25; // ms

    // Callbacks
    this.onBeat = null;
    this.onStop = null;
  }

  /**
   * Start playback
   */
  play() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.currentBeat = (this.loopStart - 1) * 16; // Convert bars to 16th notes
    this.nextBeatTime = this.engine.currentTime;

    // Start scheduler
    this.schedulerInterval = setInterval(() => this.scheduler(), this.lookAhead);

    console.log('[Transport] Playing');
  }

  /**
   * Stop playback
   */
  stop() {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    // Stop all voices
    this.engine.stopAll();

    // Reset position
    this.currentBeat = (this.loopStart - 1) * 16;

    if (this.onStop) this.onStop();

    console.log('[Transport] Stopped');
  }

  /**
   * Main scheduler loop
   */
  scheduler() {
    const currentTime = this.engine.currentTime;

    // Schedule notes while we're within the look-ahead window
    while (this.nextBeatTime < currentTime + this.scheduleAheadTime) {
      this.scheduleBeat(this.currentBeat, this.nextBeatTime);
      this.advanceBeat();
    }
  }

  /**
   * Schedule events for a specific beat
   */
  scheduleBeat(beat, time) {
    // Trigger beat callback (for UI updates)
    if (this.onBeat) {
      // Use setTimeout to update UI at the right time
      const delay = Math.max(0, (time - this.engine.currentTime) * 1000);
      setTimeout(() => this.onBeat(beat), delay);
    }
  }

  /**
   * Advance to the next beat
   */
  advanceBeat() {
    // Calculate seconds per 16th note
    const secondsPerBeat = 60.0 / this.bpm / 4; // 16th notes
    this.nextBeatTime += secondsPerBeat;

    // Advance beat counter
    this.currentBeat++;

    // Loop handling
    const loopEndBeat = this.loopEnd * 16;
    const loopStartBeat = (this.loopStart - 1) * 16;

    if (this.currentBeat >= loopEndBeat) {
      this.currentBeat = loopStartBeat;
    }
  }

  /**
   * Set BPM
   */
  setBPM(bpm) {
    this.bpm = Math.max(60, Math.min(200, bpm));
    this.state.bpm = this.bpm;
    console.log(`[Transport] BPM set to ${this.bpm}`);
  }

  /**
   * Set loop start (in bars)
   */
  setLoopStart(bar) {
    this.loopStart = Math.max(1, Math.min(bar, this.loopEnd - 1));
    console.log(`[Transport] Loop start: bar ${this.loopStart}`);
  }

  /**
   * Set loop end (in bars)
   */
  setLoopEnd(bar) {
    this.loopEnd = Math.max(this.loopStart + 1, Math.min(bar, 128)); // Extended for long-form
    console.log(`[Transport] Loop end: bar ${this.loopEnd}`);
  }

  /**
   * Get current position info
   */
  getPosition() {
    const bar = Math.floor(this.currentBeat / 16) + 1;
    const beat = (this.currentBeat % 16) + 1;
    return { bar, beat, totalBeats: this.currentBeat };
  }

  /**
   * Convert time to beat position
   */
  timeToBeat(seconds) {
    const secondsPerBeat = 60.0 / this.bpm / 4;
    return Math.floor(seconds / secondsPerBeat);
  }

  /**
   * Convert beat to time
   */
  beatToTime(beat) {
    const secondsPerBeat = 60.0 / this.bpm / 4;
    return beat * secondsPerBeat;
  }
}
