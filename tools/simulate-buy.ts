import { performance } from "node:perf_hooks";
import { gameConfig, SlotEngine } from "../src/core/engine";
import { createGameState } from "../src/core/state";

function readPositiveArgument(name: string, fallback: number): number {
  const value = process.argv.find((argument) => argument.startsWith(`--${name}=`))?.split("=")[1];
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid --${name} value: ${value}`);
  return Math.floor(parsed);
}

const spins = readPositiveArgument("spins", 100000);
const seed = readPositiveArgument("seed", 7411);
const engine = new SlotEngine(seed);
const tiers = { mini: 0, minor: 0, major: 0, grand: 0 };
let totalPayout = 0;
let fullGrids = 0;
const startedAt = performance.now();

for (let index = 0; index < spins; index += 1) {
  const result = engine.buyFeature(1, createGameState());
  totalPayout += result.win;
  const bonus = result.bonus;
  if (!bonus) continue;
  tiers[bonus.jackpotTier] += 1;
  if (bonus.fullGrid) fullGrids += 1;
}

const cost = gameConfig.bonus.buyCostBetMultiplier;
const meanPayout = totalPayout / spins;
console.log(
  JSON.stringify(
    {
      featureBuys: spins,
      seed,
      configuredCost: `${cost}× bet`,
      meanPayout: Number(meanPayout.toFixed(3)),
      impliedRtp: `${((meanPayout / cost) * 100).toFixed(3)}%`,
      fullGridFrequency: `${((fullGrids / spins) * 100).toFixed(3)}%`,
      jackpotDistribution: tiers,
      elapsedSeconds: Number(((performance.now() - startedAt) / 1000).toFixed(2)),
    },
    null,
    2,
  ),
);
