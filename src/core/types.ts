import type rawConfig from "./config.json";

export type SymbolId = keyof typeof rawConfig.symbols;
export type CellSymbol = SymbolId | "EMPTY";
export type JackpotId = "mini" | "minor" | "major" | "grand";
export type VesselId = "JADE" | "EMBER" | "TIDE";
export type Grid = CellSymbol[][]; // [reel][row]

export interface SymbolMeta {
  label: string;
  kind: "low" | "high" | "wild" | "coin" | "bonus";
  color: string;
}

export interface JackpotLevel {
  id: JackpotId;
  label: string;
  multiplier: number;
  color: string;
}

export interface GameConfig {
  game: { id: string; title: string; demoOnly: boolean; reels: number; rows: number; ways: number };
  symbols: Record<SymbolId, SymbolMeta>;
  reelStrips: SymbolId[][];
  paytable: Partial<Record<SymbolId, Record<string, number>>>;
  coinValues: { value: number; weight: number }[];
  pot: {
    vessels: VesselId[];
    chanceUpgradeProbability: number;
    chanceUpgradeExtra: number;
    meterThresholds: number[];
    levels: JackpotLevel[];
  };
  bonus: {
    triggerCoins: number;
    featureCoinProbability: number;
    startingRespins: number;
    buyCostBetMultiplier: number;
    fullGridPayoutMultiplier: number;
  };
  math: {
    targetRtp: number;
    rtpTolerance: number;
    payoutScale: number;
    defaultSeed: number;
    defaultSpins: number;
  };
  ui: { startingBalance: number; defaultBet: number; betOptions: number[] };
}

export interface PotState {
  meter: number;
  tierIndex: number;
  vesselTotals: number[];
}

export interface GameState {
  pot: PotState;
  spinsPlayed: number;
  bonusCount: number;
}

export interface CoinSymbol {
  reel: number;
  row: number;
  value: number;
  vesselIndex: number;
  upgraded: boolean;
}

export interface WayWin {
  symbol: SymbolId;
  reelsMatched: number;
  ways: number;
  multiplier: number;
  reelRows: number[][];
}

export interface FeatureRound {
  grid: Grid;
  newCoins: CoinSymbol[];
  coinsLocked: number;
  respinsLeft: number;
}

export interface BonusResult {
  rounds: FeatureRound[];
  coins: CoinSymbol[];
  coinMultiplier: number;
  jackpotMultiplier: number;
  jackpotValue: number;
  jackpotTier: JackpotId;
  fullGrid: boolean;
  payout: number;
  purchased: boolean;
}

export interface SpinResult {
  grid: Grid;
  coins: CoinSymbol[];
  ways: WayWin[];
  waysMultiplier: number;
  waysWin: number;
  bonus: BonusResult | null;
  win: number;
  potBefore: PotState;
  potAfter: PotState;
  purchased: boolean;
}

export interface RandomSource {
  next(): number;
  int(maxExclusive: number): number;
}
