import { describe, expect, it } from "vitest";
import { evaluateWays, gameConfig, SlotEngine } from "./engine";
import { createGameState } from "./state";
import type { GameConfig, Grid, RandomSource, SymbolId } from "./types";

const alwaysFirst: RandomSource = { next: () => 0, int: () => 0 };
const forcedFeatureConfig: GameConfig = {
  ...gameConfig,
  reelStrips: Array.from({ length: 5 }, () => ["COIN", "COIN", "TEN"] as SymbolId[]),
  pot: { ...gameConfig.pot, chanceUpgradeProbability: 0, meterThresholds: [0, 2, 4, 6] },
  bonus: { ...gameConfig.bonus, featureCoinProbability: 1 },
};

describe("seeded slot engine", () => {
  it("replays the same sequence from the same seed", () => {
    const first = new SlotEngine(7744);
    const second = new SlotEngine(7744);
    const firstState = createGameState();
    const secondState = createGameState();
    const firstResults = Array.from({ length: 20 }, () => first.spin(1, firstState));
    const secondResults = Array.from({ length: 20 }, () => second.spin(1, secondState));
    expect(firstResults).toEqual(secondResults);
  });

  it("scores 243 ways as combinations across reels, not paylines", () => {
    const grid: Grid = Array.from({ length: 5 }, () => ["TEN", "TEN", "J"]);
    const result = evaluateWays(grid, gameConfig);
    const tenWin = result.wins.find((win) => win.symbol === "TEN");
    expect(tenWin?.reelsMatched).toBe(5);
    expect(tenWin?.ways).toBe(2 ** 5);
    expect(tenWin?.multiplier).toBe(2 ** 5 * (gameConfig.paytable.TEN?.["5"] ?? 0));
  });

  it("allows WILD to substitute, but never for COIN or BONUS", () => {
    const substituteGrid: Grid = [
      ["TEN", "WILD", "J"],
      ["WILD", "TEN", "J"],
      ["TEN", "WILD", "J"],
      ["COIN", "BONUS", "J"],
      ["COIN", "BONUS", "J"],
    ];
    const result = evaluateWays(substituteGrid, gameConfig);
    expect(result.wins.some((win) => win.symbol === "TEN")).toBe(true);
    expect(result.wins.some((win) => win.symbol === "COIN" || win.symbol === "BONUS")).toBe(false);
  });

  it("keeps every strip at 64 stops and all requested base symbols in the config", () => {
    expect(gameConfig.reelStrips).toHaveLength(5);
    expect(gameConfig.reelStrips.every((strip) => strip.length === 160)).toBe(true);
    expect(Object.values(gameConfig.symbols).filter((symbol) => symbol.kind === "high")).toHaveLength(7);
    expect(gameConfig.game.ways).toBe(243);
  });

  it("locks six-or-more coins, resets respins and awards Grand when all cells fill", () => {
    const state = createGameState();
    const result = new SlotEngine(1, forcedFeatureConfig, alwaysFirst).spin(1, state);

    expect(result.coins.length).toBe(10);
    expect(result.bonus?.fullGrid).toBe(true);
    expect(result.bonus?.jackpotTier).toBe("grand");
    expect(result.bonus?.rounds).toHaveLength(1);
    expect(result.bonus?.rounds[0]?.coinsLocked).toBe(15);
    expect(result.bonus?.payout).toBeGreaterThanOrEqual(2000);
    expect(state.pot).toEqual({ meter: 0, tierIndex: 0, vesselTotals: [0, 0, 0] });
  });

  it("preserves the base Pot when the isolated Buy Feature is used", () => {
    const state = createGameState();
    state.pot = { meter: 420, tierIndex: 3, vesselTotals: [120, 150, 150] };
    const preserved = structuredClone(state.pot);
    const result = new SlotEngine(2, forcedFeatureConfig, alwaysFirst).buyFeature(1, state);

    expect(result.purchased).toBe(true);
    expect(result.bonus?.fullGrid).toBe(true);
    expect(state.pot).toEqual(preserved);
    expect(state.spinsPlayed).toBe(1);
  });

  it("rejects invalid bets", () => {
    expect(() => new SlotEngine(1).spin(0, createGameState())).toThrow(RangeError);
  });
});
