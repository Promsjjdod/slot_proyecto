/* Original procedural audio generator for Bruma de Jade. No third-party samples are used. */
const fs = require("node:fs");
const path = require("node:path");
// lamejs 1.2.1 ships two CommonJS modules that reference globals instead of importing them.
global.MPEGMode = require("lamejs/src/js/MPEGMode.js");
global.Lame = require("lamejs/src/js/Lame.js");
global.BitStream = require("lamejs/src/js/BitStream.js");
const { Mp3Encoder } = require("lamejs");

const SAMPLE_RATE = 22050;
const OUTPUT = path.join(__dirname, "..", "public", "assets", "audio");
const PENTATONIC = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
fs.mkdirSync(OUTPUT, { recursive: true });

function envelope(time, duration, attack = 0.012, release = 0.16) {
  if (time < 0 || time > duration) return 0;
  const attackGain = Math.min(1, time / attack);
  const releaseGain = Math.min(1, (duration - time) / release);
  return Math.max(0, attackGain * releaseGain * Math.exp(-time * 1.7));
}

function addPluck(buffer, start, frequency, amplitude, duration, brightness = 1) {
  const first = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const last = Math.min(buffer.length, Math.ceil((start + duration) * SAMPLE_RATE));
  for (let sample = first; sample < last; sample += 1) {
    const time = sample / SAMPLE_RATE - start;
    const env = envelope(time, duration, 0.009, 0.2);
    const fundamental = Math.sin(2 * Math.PI * frequency * time);
    const second = Math.sin(2 * Math.PI * frequency * 2.003 * time) * 0.27 * brightness;
    const third = Math.sin(2 * Math.PI * frequency * 3.011 * time) * 0.095 * brightness;
    const shimmer = Math.sin(2 * Math.PI * frequency * 4.02 * time) * 0.035 * brightness;
    buffer[sample] += amplitude * env * (fundamental + second + third + shimmer);
  }
}

function addSoftDrum(buffer, start, amplitude, duration = 0.22, seed = 1) {
  const first = Math.floor(start * SAMPLE_RATE);
  const last = Math.min(buffer.length, Math.ceil((start + duration) * SAMPLE_RATE));
  let state = seed >>> 0;
  for (let sample = first; sample < last; sample += 1) {
    const time = sample / SAMPLE_RATE - start;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const noise = ((state >>> 8) / 0x800000 - 1) * 0.18;
    const tone = Math.sin(2 * Math.PI * (82 - time * 22) * time) * Math.exp(-time * 11);
    buffer[sample] += amplitude * (noise * Math.exp(-time * 15) + tone * 0.7);
  }
}

function makeMusic(feature = false) {
  const loopDuration = 16;
  const buffer = new Float32Array(Math.floor(loopDuration * SAMPLE_RATE));
  const beat = feature ? 0.47 : 0.62;
  const stepsPerLoop = Math.floor(8 / beat);
  const melody = feature
    ? [4, 6, 5, 2, 3, 5, 7, 6, 4, 2, 3, 6, 5, 3, 1, 2]
    : [0, 2, 4, 2, 1, 3, 5, 4, 0, 2, 6, 4, 1, 3, 5, 2];
  const bass = feature ? [0, 3, 4, 2] : [0, 4, 2, 5];

  for (let loop = 0; loop < 2; loop += 1) {
    const origin = loop * 8;
    for (let step = 0; step < stepsPerLoop; step += 1) {
      const start = origin + step * beat;
      if (start > origin + 7.1) break;
      const note = PENTATONIC[melody[step % melody.length]] * (feature ? 1.5 : 1);
      addPluck(buffer, start, note, feature ? 0.12 : 0.095, 0.54, feature ? 1.35 : 1.0);
      if (step % 2 === 0) {
        addPluck(buffer, start + 0.025, note * 2, feature ? 0.034 : 0.027, 0.31, 1.2);
      }
      if (feature && step % 4 === 0) addSoftDrum(buffer, start + 0.02, 0.11, 0.24, step + 29);
    }

    for (let bar = 0; bar < 4; bar += 1) {
      const start = origin + bar * 1.85;
      const bassNote = PENTATONIC[bass[bar % bass.length]] / 2;
      addPluck(buffer, start, bassNote, feature ? 0.1 : 0.075, 1.0, 0.45);
      addPluck(buffer, start + 0.01, bassNote * 1.5, feature ? 0.045 : 0.035, 0.82, 0.5);
    }
  }

  // A small, quiet bed of wind-like harmonics gives each loop a soft cinematic tail.
  for (let sample = 0; sample < buffer.length; sample += 1) {
    const time = sample / SAMPLE_RATE;
    const phase = (time % 8) / 8;
    const swell = Math.sin(Math.PI * phase) ** 2;
    buffer[sample] += Math.sin(2 * Math.PI * (feature ? 110 : 82.4) * time) * (feature ? 0.012 : 0.015) * swell;
  }
  return buffer;
}

function makeSfx(name, duration) {
  const buffer = new Float32Array(Math.floor(duration * SAMPLE_RATE));
  const addTone = (start, frequency, amplitude, length, brightness = 1) =>
    addPluck(buffer, start, frequency, amplitude, length, brightness);

  switch (name) {
    case "ui-click":
      addTone(0.005, 960, 0.22, 0.095, 1.5);
      addTone(0.028, 1420, 0.065, 0.08, 1.7);
      break;
    case "spin-start":
      addTone(0.02, 115, 0.18, 0.28, 0.6);
      addTone(0.12, 172, 0.1, 0.32, 0.8);
      addSoftDrum(buffer, 0.01, 0.15, 0.3, 74);
      break;
    case "reel-stop":
      addTone(0.005, 392, 0.17, 0.16, 0.8);
      addTone(0.035, 587, 0.07, 0.12, 1.0);
      break;
    case "coin-cascade":
      addTone(0.01, 1046.5, 0.19, 0.38, 1.2);
      addTone(0.08, 1318.5, 0.12, 0.42, 1.4);
      addTone(0.16, 1568, 0.08, 0.47, 1.3);
      break;
    case "pot-rise":
      addTone(0.01, 392, 0.11, 0.4, 1.2);
      addTone(0.11, 523.25, 0.13, 0.44, 1.2);
      addTone(0.22, 659.25, 0.16, 0.55, 1.3);
      addTone(0.33, 783.99, 0.15, 0.68, 1.4);
      break;
    case "win-chime":
      addTone(0.01, 523.25, 0.13, 0.58, 1.1);
      addTone(0.07, 659.25, 0.11, 0.62, 1.15);
      addTone(0.14, 783.99, 0.1, 0.72, 1.2);
      addTone(0.22, 1046.5, 0.08, 0.72, 1.2);
      break;
    case "bonus-transition":
      addSoftDrum(buffer, 0.02, 0.16, 0.32, 303);
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((note, index) =>
        addTone(0.07 + index * 0.1, note, 0.11, 0.72, 1.2),
      );
      break;
    case "jade-jackpot":
      [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((note, index) =>
        addTone(0.02 + index * 0.045, note, 0.105, 1.25, 1.35),
      );
      addSoftDrum(buffer, 0.015, 0.22, 0.42, 2701);
      break;
    case "anticipation":
      for (let index = 0; index < 5; index += 1) addTone(0.04 + index * 0.105, 523.25 + index * 50, 0.09, 0.17, 1.4);
      break;
    case "night-ambience":
      addTone(0.03, 196, 0.024, 1.3, 0.4);
      addTone(0.31, 293.66, 0.016, 1.0, 0.6);
      addTone(0.82, 392, 0.012, 1.0, 0.5);
      break;
  }

  return buffer;
}

function encodeMp3(floatSamples, filename, kbps = 80) {
  const encoder = new Mp3Encoder(1, SAMPLE_RATE, kbps);
  const blockSize = 1152;
  const mp3Chunks = [];
  for (let offset = 0; offset < floatSamples.length; offset += blockSize) {
    const available = Math.min(blockSize, floatSamples.length - offset);
    const block = new Int16Array(available);
    for (let index = 0; index < available; index += 1) {
      const sample = Math.max(-0.92, Math.min(0.92, floatSamples[offset + index]));
      block[index] = sample * 32767;
    }
    const encoded = encoder.encodeBuffer(block);
    if (encoded.length > 0) mp3Chunks.push(Buffer.from(encoded));
  }
  const tail = encoder.flush();
  if (tail.length > 0) mp3Chunks.push(Buffer.from(tail));
  fs.writeFileSync(path.join(OUTPUT, filename), Buffer.concat(mp3Chunks));
  console.log(`${filename.padEnd(25)} ${(fs.statSync(path.join(OUTPUT, filename)).size / 1024).toFixed(1)} KB`);
}

encodeMp3(makeMusic(false), "base-loop.mp3", 80);
encodeMp3(makeMusic(true), "hold-spin-loop.mp3", 96);
const effects = [
  ["ui-click.mp3", 0.22],
  ["spin-start.mp3", 0.62],
  ["reel-stop.mp3", 0.26],
  ["coin-cascade.mp3", 0.78],
  ["pot-rise.mp3", 0.92],
  ["win-chime.mp3", 1.12],
  ["bonus-transition.mp3", 1.12],
  ["jade-jackpot.mp3", 1.62],
  ["anticipation.mp3", 0.72],
  ["night-ambience.mp3", 1.9],
];
for (const [name, duration] of effects) encodeMp3(makeSfx(name.replace(".mp3", ""), duration), name, 64);
