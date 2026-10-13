import { performance } from "node:perf_hooks";
import { gameConfig, SlotEngine } from "../src/core/engine";
import { createGameState } from "../src/core/state";

function readNumberArgument(name: string, fallback: number): number {
  const value = process.argv.find((argument) => argument.startsWith(`--${name}=`))?.split("=")[1];
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid --${name} value: ${value}`);
  return parsed;
}

const spins = Math.floor(readNumberArgument("spins", gameConfig.math.defaultSpins));
const seed = Math.floor(readNumberArgument("seed", gameConfig.math.defaultSeed));
const shouldCheck = process.argv.includes("--check");
const engine = new SlotEngine(seed);
const state = createGameState();
const jackpotCounts = { mini: 0, minor: 0, major: 0, grand: 0 };
let totalWin = 0;
let hits = 0;
let bonusTriggers = 0;
let fullGridWins = 0;
let biggestWin = 0;
const startedAt = performance.now();

for (let index = 0; index < spins; index += 1) {
  const result = engine.spin(1, state);
  totalWin += result.win;
  if (result.win > 0) hits += 1;
  if (result.bonus) {
    bonusTriggers += 1;
    jackpotCounts[result.bonus.jackpotTier] += 1;
    if (result.bonus.fullGrid) fullGridWins += 1;
  }
  if (result.win > biggestWin) biggestWin = result.win;
}

const elapsedSeconds = (performance.now() - startedAt) / 1000;
const rtp = totalWin / spins;
const hitFrequency = hits / spins;
const bonusFrequency = bonusTriggers / spins;
const expectedRtp = gameConfig.math.targetRtp;
const tolerance = gameConfig.math.rtpTolerance;
const report = {
  title: gameConfig.game.title,
  spins,
  seed,
  targetRtp: expectedRtp,
  observedRtp: rtp,
  rtpPercent: `${(rtp * 100).toFixed(3)}%`,
  hitFrequency: `${(hitFrequency * 100).toFixed(3)}%`,
  bonusFrequency: `${(bonusFrequency * 100).toFixed(4)}% (${bonusTriggers} bonuses)`,
  jackpotDistribution: jackpotCounts,
  fullGridWins,
  biggestWinMultiplier: Number(biggestWin.toFixed(2)),
  elapsedSeconds: Number(elapsedSeconds.toFixed(2)),
  spinsPerSecond: Math.round(spins / elapsedSeconds),
  checked: shouldCheck,
};

console.log(JSON.stringify(report, null, 2));
if (shouldCheck && Math.abs(rtp - expectedRtp) > tolerance) {
  console.error(
    `RTP check failed: observed ${(rtp * 100).toFixed(3)}%, expected ${(expectedRtp * 100).toFixed(2)}% ± ${(tolerance * 100).toFixed(2)} percentage points.`,
  );
  process.exitCode = 1;
}
