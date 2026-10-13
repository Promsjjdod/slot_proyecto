import { Application, Container, Graphics, Text } from "pixi.js";
import { gsap } from "gsap";
import { ParticleFX } from "../fx/particles";
import type { CellSymbol, CoinSymbol, Grid, SpinResult } from "../core/types";

interface CellView {
  container: Container;
  background: Graphics;
  symbolLayer: Container;
  reel: number;
  row: number;
}

const SYMBOL_COLORS: Record<string, number> = {
  TEN: 0x54edb3,
  J: 0x54d8ff,
  Q: 0xf182d2,
  K: 0xc49aff,
  A: 0xff8174,
  KOI: 0xff8665,
  LANTERN: 0xffc15e,
  LOTUS: 0xf48acb,
  JADE_KNOT: 0x75e1b8,
  DRAGON: 0xffdc73,
  PAGODA: 0x94b8ff,
  MOON_GATE: 0xd0b0ff,
  WILD: 0xffdf79,
  COIN: 0xffd36a,
  BONUS: 0xff9877,
};

function labelText(text: string, fontSize: number, color: number, fontFamily = "Marcellus, Georgia, serif"): Text {
  const label = new Text({
    text,
    style: {
      fontFamily,
      fontSize,
      fontWeight: "bold",
      fill: color,
      align: "center",
      stroke: { color: 0x12251f, width: Math.max(1, fontSize * 0.075) },
      dropShadow: { color: 0x06120f, blur: 4, distance: 2, angle: Math.PI / 3, alpha: 0.7 },
    },
  });
  label.anchor.set(0.5);
  return label;
}

function addPolygon(graphics: Graphics, points: number[], color: number, alpha = 1): void {
  graphics.poly(points, true).fill({ color, alpha });
}

export class SlotBoardView {
  readonly root = new Container();
  private readonly app: Application;
  private readonly reducedMotion: boolean;
  private readonly effects: ParticleFX;
  private frame = new Graphics();
  private trace = new Graphics();
  private reelColumns: Container[] = [];
  private cells: CellView[][] = [];
  private boardLeft = 0;
  private boardTop = 0;
  private cellWidth = 0;
  private cellHeight = 0;
  private gapX = 0;
  private gapY = 0;
  private currentGrid: Grid;
  private currentCoins: CoinSymbol[] = [];
  private currentWinningCells = new Set<string>();
  private currentWinningWays: SpinResult["ways"] = [];
  private resizeObserver: ResizeObserver;

  constructor(app: Application, host: HTMLElement, initialGrid: Grid, reducedMotion = false) {
    this.app = app;
    this.currentGrid = initialGrid;
    this.reducedMotion = reducedMotion;
    this.effects = new ParticleFX(reducedMotion);
    this.root.label = "bruma-de-jade-board";
    this.app.stage.addChild(this.root);
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(host);
    this.layout();
  }

  setGrid(
    grid: Grid,
    coins: CoinSymbol[] = [],
    winningCells: Set<string> = new Set(),
    ways: SpinResult["ways"] = [],
  ): void {
    this.currentGrid = grid;
    this.currentCoins = coins;
    this.currentWinningCells = new Set(winningCells);
    this.currentWinningWays = ways;
    this.renderAllCells();
    this.drawWinTrace();
  }

  async animateSpin(result: SpinResult, durationMs = 720, onReelStop?: () => void): Promise<void> {
    const timelinePromises = this.reelColumns.map(
      (column, reel) =>
        new Promise<void>((resolve) => {
          const duration = Math.max(220, durationMs + reel * (this.reducedMotion ? 25 : 95));
          const cycles = Math.max(2, Math.round(duration / 150));
          const timeline = gsap.timeline({
            onComplete: () => {
              gsap.to(column, {
                y: 0,
                duration: this.reducedMotion ? 0.08 : 0.18,
                ease: "back.out(2.5)",
                onComplete: () => {
                  this.renderReel(reel, result.grid, result.coins, new Set());
                  this.effects.burst(
                    this.boardLeft + reel * (this.cellWidth + this.gapX) + this.cellWidth / 2,
                    8,
                    0xf2d48a,
                    5,
                  );
                  onReelStop?.();
                  resolve();
                },
              });
            },
          });
          timeline.to(column, {
            y: 7,
            duration: 0.075,
            repeat: cycles,
            yoyo: true,
            ease: "none",
            delay: reel * 0.025,
          });
        }),
    );

    await Promise.all(timelinePromises);
    const evaluation = result.ways;
    const winningCells = new Set<string>();
    for (const win of evaluation) {
      for (let reel = 0; reel < win.reelsMatched; reel += 1) {
        for (const row of win.reelRows[reel] ?? []) winningCells.add(`${reel}:${row}`);
      }
    }
    this.currentGrid = result.grid;
    this.currentCoins = result.coins;
    this.currentWinningCells = winningCells;
    this.currentWinningWays = evaluation;
    this.renderAllCells();
    this.drawWinTrace();
    if (winningCells.size > 0) this.animateWin();
  }

  animateWin(): void {
    const winning = this.cells.flat().filter((cell) => this.currentWinningCells.has(`${cell.reel}:${cell.row}`));
    for (const cell of winning) {
      gsap.to(cell.container.scale, {
        x: 1.07,
        y: 1.07,
        duration: 0.22,
        repeat: 3,
        yoyo: true,
        ease: "sine.inOut",
        delay: (cell.reel + cell.row) * 0.018,
      });
    }
    const first = winning[0];
    if (first) {
      const point = this.getCellCenter(first.reel, first.row);
      this.effects.burst(point.x, point.y, 0xffe18b, this.reducedMotion ? 6 : 24);
    }
  }

  async flyCoins(coins: CoinSymbol[], turbo = false): Promise<void> {
    if (coins.length === 0) return;
    const selected = this.reducedMotion ? coins.slice(0, 3) : coins.slice(0, 10);
    await Promise.all(
      selected.map((coin, index) => {
        const from = this.getCellCenter(coin.reel, coin.row);
        const targetX = this.app.screen.width * (0.28 + (coin.vesselIndex % 3) * 0.22);
        return this.effects.flyCoin(from.x, from.y, targetX, 0, index * (turbo ? 0.015 : 0.06), turbo ? 0.28 : 0.62);
      }),
    );
  }

  showFeatureRound(grid: Grid, coins: CoinSymbol[], isFinal = false): void {
    this.currentGrid = grid;
    this.currentCoins = coins;
    this.currentWinningCells = new Set();
    this.currentWinningWays = [];
    this.renderAllCells();
    this.trace.clear();
    if (!isFinal) {
      for (const coin of coins.slice(-3)) {
        const point = this.getCellCenter(coin.reel, coin.row);
        this.effects.burst(point.x, point.y, 0xffd778, 9);
      }
    }
  }

  burstCenter(color = 0xffdc83, count = 38): void {
    this.effects.burst(this.app.screen.width / 2, this.app.screen.height / 2, color, count);
  }

  getCellCenter(reel: number, row: number): { x: number; y: number } {
    return {
      x: this.boardLeft + reel * (this.cellWidth + this.gapX) + this.cellWidth / 2,
      y: this.boardTop + row * (this.cellHeight + this.gapY) + this.cellHeight / 2,
    };
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.effects.clear();
    this.root.destroy({ children: true });
  }

  private layout(): void {
    const width = Math.max(1, this.app.screen.width);
    const height = Math.max(1, this.app.screen.height);
    for (const child of this.root.removeChildren()) {
      if (child === this.effects.layer) continue;
      child.destroy({ children: true });
    }
    this.frame = new Graphics();
    this.trace = new Graphics();
    this.root.addChild(this.frame);
    this.reelColumns = [];
    this.cells = [];

    const outerX = Math.max(6, width * 0.026);
    const outerY = Math.max(5, height * 0.022);
    this.gapX = Math.max(3, width * 0.014);
    this.gapY = Math.max(3, height * 0.022);
    this.cellWidth = (width - outerX * 2 - this.gapX * 4) / 5;
    this.cellHeight = (height - outerY * 2 - this.gapY * 2) / 3;
    this.boardLeft = outerX;
    this.boardTop = outerY;

    this.frame
      .roundRect(1, 1, width - 2, height - 2, 12)
      .fill({ color: 0x03171e, alpha: 0.26 })
      .stroke({ color: 0x75d6ba, width: 1, alpha: 0.16 });
    this.frame.roundRect(4, 4, width - 8, height - 8, 10).stroke({ color: 0xf6d788, width: 1, alpha: 0.25 });

    for (let reel = 0; reel < 5; reel += 1) {
      const column = new Container();
      column.label = `reel-${reel + 1}`;
      column.x = this.boardLeft + reel * (this.cellWidth + this.gapX);
      column.y = this.boardTop;
      this.root.addChild(column);
      this.reelColumns.push(column);
      const reelCells: CellView[] = [];
      for (let row = 0; row < 3; row += 1) {
        const container = new Container();
        container.x = 0;
        container.y = row * (this.cellHeight + this.gapY);
        const background = new Graphics();
        const symbolLayer = new Container();
        container.addChild(background, symbolLayer);
        column.addChild(container);
        reelCells.push({ container, background, symbolLayer, reel, row });
      }
      this.cells.push(reelCells);
    }
    this.root.addChild(this.trace);
    this.root.addChild(this.effects.layer);
    this.renderAllCells();
    this.drawWinTrace();
  }

  private renderAllCells(): void {
    for (let reel = 0; reel < this.cells.length; reel += 1)
      this.renderReel(reel, this.currentGrid, this.currentCoins, this.currentWinningCells);
  }

  private renderReel(reel: number, grid: Grid, coins: CoinSymbol[], winningCells: Set<string>): void {
    for (const cell of this.cells[reel] ?? []) {
      const symbol = grid[cell.reel]?.[cell.row] ?? "EMPTY";
      const key = `${cell.reel}:${cell.row}`;
      const isWinning = winningCells.has(key);
      const graphics = cell.background;
      graphics.clear();
      const inset = isWinning ? 0 : 1;
      graphics
        .roundRect(
          inset,
          inset,
          this.cellWidth - inset * 2,
          this.cellHeight - inset * 2,
          Math.max(5, this.cellWidth * 0.12),
        )
        .fill({ color: isWinning ? 0x42513a : 0x09242b, alpha: isWinning ? 0.97 : 0.93 })
        .stroke({
          color: isWinning ? 0xffe69a : 0xe8c978,
          width: isWinning ? 2.3 : 1.1,
          alpha: isWinning ? 0.98 : 0.62,
        });
      graphics
        .roundRect(
          4,
          4,
          Math.max(1, this.cellWidth - 8),
          Math.max(1, this.cellHeight - 8),
          Math.max(4, this.cellWidth * 0.09),
        )
        .stroke({ color: isWinning ? 0xfff0bd : 0x61bda5, width: 0.65, alpha: isWinning ? 0.65 : 0.18 });

      for (const child of cell.symbolLayer.removeChildren()) child.destroy({ children: true });
      if (symbol !== "EMPTY") {
        const coin = coins.find((item) => item.reel === cell.reel && item.row === cell.row);
        cell.symbolLayer.addChild(this.makeSymbol(symbol, this.cellWidth, this.cellHeight, coin?.value));
      } else {
        const sparkle = new Graphics()
          .circle(this.cellWidth / 2, this.cellHeight / 2, 1.3)
          .fill({ color: 0xc1dcc9, alpha: 0.25 });
        cell.symbolLayer.addChild(sparkle);
      }
      cell.container.scale.set(1);
    }
  }

  private makeSymbol(symbol: CellSymbol, width: number, height: number, coinValue?: number): Container {
    const root = new Container();
    root.label = `symbol-${symbol.toLowerCase()}`;
    const centerX = width / 2;
    const centerY = height / 2;
    const color = SYMBOL_COLORS[symbol] ?? 0xe9d38b;
    const scale = Math.min(width, height);
    const icon = new Graphics();

    if (["TEN", "J", "Q", "K", "A"].includes(symbol)) {
      const letters: Record<string, string> = { TEN: "10", J: "J", Q: "Q", K: "K", A: "A" };
      const fontSize = Math.min(width * (symbol === "TEN" ? 0.46 : 0.58), height * 0.63);
      const halo = new Graphics().circle(centerX, centerY, scale * 0.32).fill({ color, alpha: 0.12 });
      root.addChild(halo);
      const label = labelText(letters[symbol]!, fontSize, color);
      label.position.set(centerX, centerY + 1);
      root.addChild(label);
      const underline = new Graphics()
        .moveTo(centerX - scale * 0.19, centerY + scale * 0.34)
        .lineTo(centerX + scale * 0.19, centerY + scale * 0.34)
        .stroke({ color, width: 1.2, alpha: 0.62 });
      root.addChild(underline);
      return root;
    }

    switch (symbol) {
      case "KOI": {
        const body = new Graphics();
        body
          .ellipse(centerX - scale * 0.27, centerY - scale * 0.12, scale * 0.54, scale * 0.3)
          .fill({ color: 0xff815e });
        body
          .ellipse(centerX - scale * 0.18, centerY - scale * 0.1, scale * 0.25, scale * 0.21)
          .fill({ color: 0xffd178, alpha: 0.9 });
        body.circle(centerX + scale * 0.18, centerY - scale * 0.02, scale * 0.035).fill({ color: 0x183a3c });
        addPolygon(
          body,
          [
            centerX - scale * 0.23,
            centerY,
            centerX - scale * 0.4,
            centerY - scale * 0.17,
            centerX - scale * 0.38,
            centerY + scale * 0.18,
          ],
          0xf6785d,
        );
        body
          .moveTo(centerX - scale * 0.02, centerY + scale * 0.13)
          .lineTo(centerX - scale * 0.1, centerY + scale * 0.24)
          .lineTo(centerX + scale * 0.06, centerY + scale * 0.18)
          .fill({ color: 0xe96554 });
        root.addChild(body);
        break;
      }
      case "LANTERN": {
        icon
          .roundRect(centerX - scale * 0.19, centerY - scale * 0.25, scale * 0.38, scale * 0.47, scale * 0.08)
          .fill({ color: 0xc94d49 })
          .stroke({ color: 0xffd979, width: 1.4 });
        icon
          .moveTo(centerX, centerY - scale * 0.37)
          .lineTo(centerX, centerY - scale * 0.26)
          .stroke({ color: 0xffe69a, width: 1.8 });
        icon
          .moveTo(centerX - scale * 0.19, centerY - scale * 0.12)
          .lineTo(centerX + scale * 0.19, centerY - scale * 0.12)
          .moveTo(centerX - scale * 0.19, centerY + scale * 0.08)
          .lineTo(centerX + scale * 0.19, centerY + scale * 0.08)
          .stroke({ color: 0xffd979, width: 1.2, alpha: 0.9 });
        icon
          .moveTo(centerX, centerY + scale * 0.22)
          .lineTo(centerX, centerY + scale * 0.37)
          .stroke({ color: 0xffe69a, width: 1.5 });
        icon.circle(centerX, centerY - scale * 0.02, scale * 0.045).fill({ color: 0xffebaa });
        root.addChild(icon);
        break;
      }
      case "LOTUS": {
        const petalColors = [0xf6a3d0, 0xf17fbd, 0xffd7e7];
        for (let petal = 0; petal < 7; petal += 1) {
          const angle = (Math.PI * 2 * petal) / 7;
          const x = centerX + Math.cos(angle) * scale * 0.11;
          const y = centerY + Math.sin(angle) * scale * 0.1;
          icon
            .ellipse(x - scale * 0.075, y - scale * 0.2, scale * 0.15, scale * 0.31)
            .fill({ color: petalColors[petal % petalColors.length]!, alpha: 0.9 });
        }
        icon
          .circle(centerX, centerY, scale * 0.09)
          .fill({ color: 0xffdc7b })
          .stroke({ color: 0xfff0bd, width: 1 });
        root.addChild(icon);
        break;
      }
      case "JADE_KNOT": {
        icon
          .moveTo(centerX - scale * 0.24, centerY)
          .bezierCurveTo(
            centerX - scale * 0.24,
            centerY - scale * 0.23,
            centerX + scale * 0.12,
            centerY - scale * 0.28,
            centerX + scale * 0.18,
            centerY - scale * 0.06,
          );
        icon.bezierCurveTo(
          centerX + scale * 0.22,
          centerY + scale * 0.1,
          centerX - scale * 0.16,
          centerY + scale * 0.25,
          centerX - scale * 0.15,
          centerY + scale * 0.02,
        );
        icon.bezierCurveTo(
          centerX - scale * 0.13,
          centerY - scale * 0.18,
          centerX + scale * 0.2,
          centerY - scale * 0.19,
          centerX + scale * 0.23,
          centerY + scale * 0.03,
        );
        icon.bezierCurveTo(
          centerX + scale * 0.27,
          centerY + scale * 0.27,
          centerX - scale * 0.21,
          centerY + scale * 0.28,
          centerX - scale * 0.24,
          centerY,
        );
        icon.stroke({ color: 0x87edc5, width: Math.max(2, scale * 0.055), alpha: 0.92 });
        icon.circle(centerX, centerY, scale * 0.035).fill({ color: 0xffe8a1 });
        root.addChild(icon);
        break;
      }
      case "DRAGON": {
        addPolygon(
          icon,
          [
            centerX - scale * 0.24,
            centerY - scale * 0.1,
            centerX - scale * 0.38,
            centerY - scale * 0.32,
            centerX - scale * 0.1,
            centerY - scale * 0.25,
            centerX + scale * 0.12,
            centerY - scale * 0.31,
            centerX + scale * 0.35,
            centerY - scale * 0.18,
            centerX + scale * 0.29,
            centerY + scale * 0.15,
            centerX + scale * 0.08,
            centerY + scale * 0.28,
            centerX - scale * 0.2,
            centerY + scale * 0.23,
          ],
          0xeebd54,
        );
        addPolygon(
          icon,
          [
            centerX - scale * 0.08,
            centerY - scale * 0.23,
            centerX - scale * 0.18,
            centerY - scale * 0.42,
            centerX + scale * 0.01,
            centerY - scale * 0.29,
            centerX + scale * 0.2,
            centerY - scale * 0.4,
            centerX + scale * 0.17,
            centerY - scale * 0.19,
          ],
          0xffd879,
        );
        icon.circle(centerX + scale * 0.15, centerY - scale * 0.04, scale * 0.035).fill({ color: 0x7a2821 });
        icon
          .moveTo(centerX - scale * 0.11, centerY + scale * 0.12)
          .lineTo(centerX + scale * 0.18, centerY + scale * 0.12)
          .stroke({ color: 0x713a28, width: 1.4 });
        icon
          .moveTo(centerX + scale * 0.2, centerY + scale * 0.07)
          .lineTo(centerX + scale * 0.34, centerY + scale * 0.22)
          .stroke({ color: 0xffdfa0, width: 1.1 });
        icon.stroke({ color: 0xffebaa, width: 1.1, alpha: 0.8 });
        root.addChild(icon);
        break;
      }
      case "PAGODA": {
        icon
          .roundRect(centerX - scale * 0.16, centerY - scale * 0.04, scale * 0.32, scale * 0.34, scale * 0.025)
          .fill({ color: 0xe4b959 })
          .stroke({ color: 0xffe8a1, width: 1 });
        addPolygon(
          icon,
          [
            centerX - scale * 0.36,
            centerY - scale * 0.06,
            centerX - scale * 0.22,
            centerY - scale * 0.19,
            centerX + scale * 0.22,
            centerY - scale * 0.19,
            centerX + scale * 0.36,
            centerY - scale * 0.06,
          ],
          0x66c9ae,
        );
        addPolygon(
          icon,
          [
            centerX - scale * 0.28,
            centerY - scale * 0.21,
            centerX - scale * 0.14,
            centerY - scale * 0.33,
            centerX + scale * 0.14,
            centerY - scale * 0.33,
            centerX + scale * 0.28,
            centerY - scale * 0.21,
          ],
          0x77d8b8,
        );
        icon
          .moveTo(centerX, centerY - scale * 0.33)
          .lineTo(centerX, centerY - scale * 0.43)
          .stroke({ color: 0xffe39a, width: 1.5 });
        icon
          .roundRect(centerX - scale * 0.045, centerY + scale * 0.11, scale * 0.09, scale * 0.19, scale * 0.025)
          .fill({ color: 0x173537 });
        icon.stroke({ color: 0xffe8aa, width: 1.1, alpha: 0.8 });
        root.addChild(icon);
        break;
      }
      case "MOON_GATE": {
        icon
          .circle(centerX, centerY - scale * 0.01, scale * 0.25)
          .stroke({ color: 0xcba5ff, width: Math.max(3, scale * 0.07), alpha: 0.9 });
        icon.circle(centerX, centerY - scale * 0.01, scale * 0.18).stroke({ color: 0xffe4a1, width: 1, alpha: 0.65 });
        icon
          .rect(centerX - scale * 0.27, centerY + scale * 0.1, scale * 0.54, scale * 0.23)
          .fill({ color: 0x12343b, alpha: 0.8 });
        icon
          .moveTo(centerX - scale * 0.32, centerY + scale * 0.1)
          .lineTo(centerX + scale * 0.32, centerY + scale * 0.1)
          .stroke({ color: 0xffe4a1, width: 1.4 });
        icon.circle(centerX + scale * 0.11, centerY - scale * 0.12, scale * 0.045).fill({ color: 0xffe9a9 });
        root.addChild(icon);
        break;
      }
      case "WILD": {
        addPolygon(
          icon,
          [
            centerX,
            centerY - scale * 0.38,
            centerX + scale * 0.34,
            centerY,
            centerX,
            centerY + scale * 0.38,
            centerX - scale * 0.34,
            centerY,
          ],
          0xc39039,
          0.55,
        );
        icon
          .circle(centerX, centerY, scale * 0.27)
          .fill({ color: 0x225247 })
          .stroke({ color: 0xffe694, width: 2 });
        const wild = labelText("W", scale * 0.36, 0xffe694);
        wild.position.set(centerX, centerY - 1);
        root.addChild(icon, wild);
        const small = labelText("WILD", Math.max(6, scale * 0.105), 0xffe6a2, "DM Sans, sans-serif");
        small.position.set(centerX, centerY + scale * 0.32);
        root.addChild(small);
        break;
      }
      case "COIN": {
        const coin = new Graphics();
        coin
          .circle(centerX, centerY - scale * 0.04, scale * 0.3)
          .fill({ color: 0xc9892e })
          .stroke({ color: 0xffe69a, width: 1.6 });
        coin
          .circle(centerX, centerY - scale * 0.04, scale * 0.235)
          .fill({ color: 0xf1c65d })
          .stroke({ color: 0xfff0b2, width: 1 });
        coin.circle(centerX, centerY - scale * 0.04, scale * 0.17).stroke({ color: 0xb77a2c, width: 1.1, alpha: 0.8 });
        addPolygon(
          coin,
          [
            centerX,
            centerY - scale * 0.16,
            centerX + scale * 0.1,
            centerY - scale * 0.02,
            centerX,
            centerY + scale * 0.09,
            centerX - scale * 0.1,
            centerY - scale * 0.02,
          ],
          0xfff2b9,
        );
        coin.circle(centerX, centerY - scale * 0.02, scale * 0.035).fill({ color: 0x9d702d });
        root.addChild(coin);
        if (coinValue !== undefined) {
          const value = labelText(`×${coinValue}`, Math.max(7, scale * 0.135), 0xfff0b2, "DM Sans, sans-serif");
          value.position.set(centerX, centerY + scale * 0.31);
          root.addChild(value);
        }
        break;
      }
      case "BONUS": {
        addPolygon(
          icon,
          [
            centerX,
            centerY - scale * 0.34,
            centerX + scale * 0.09,
            centerY - scale * 0.1,
            centerX + scale * 0.34,
            centerY - scale * 0.1,
            centerX + scale * 0.14,
            centerY + scale * 0.04,
            centerX + scale * 0.23,
            centerY + scale * 0.31,
            centerX,
            centerY + scale * 0.15,
            centerX - scale * 0.23,
            centerY + scale * 0.31,
            centerX - scale * 0.14,
            centerY + scale * 0.04,
            centerX - scale * 0.34,
            centerY - scale * 0.1,
            centerX - scale * 0.09,
            centerY - scale * 0.1,
          ],
          0xffa66e,
        );
        icon.circle(centerX, centerY - scale * 0.03, scale * 0.12).fill({ color: 0xffe5a0 });
        root.addChild(icon);
        const label = labelText("BONUS", Math.max(6, scale * 0.11), 0xffe9b5, "DM Sans, sans-serif");
        label.position.set(centerX, centerY + scale * 0.36);
        root.addChild(label);
        break;
      }
      default: {
        const label = labelText(String(symbol), scale * 0.42, color);
        label.position.set(centerX, centerY);
        root.addChild(label);
      }
    }
    return root;
  }

  private drawWinTrace(): void {
    this.trace.clear();
    if (this.currentWinningWays.length === 0) return;
    const first = this.currentWinningWays[0];
    if (!first) return;
    const points: number[] = [];
    for (let reel = 0; reel < first.reelsMatched; reel += 1) {
      const row = first.reelRows[reel]?.[0] ?? 1;
      const point = this.getCellCenter(reel, row);
      points.push(point.x, point.y);
    }
    if (points.length < 4) return;
    this.trace.poly(points, false).stroke({ color: 0xffd974, width: 7, alpha: 0.17, cap: "round", join: "round" });
    this.trace.poly(points, false).stroke({ color: 0xffefaa, width: 2.4, alpha: 0.9, cap: "round", join: "round" });
    gsap.to(this.trace, { alpha: 0.48, duration: 0.4, repeat: 3, yoyo: true, ease: "sine.inOut" });
  }
}
