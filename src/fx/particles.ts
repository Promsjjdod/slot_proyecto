import { Container, Graphics } from "pixi.js";
import { gsap } from "gsap";

export class ParticleFX {
  readonly layer = new Container();
  private readonly reducedMotion: boolean;

  constructor(reducedMotion = false) {
    this.reducedMotion = reducedMotion;
    this.layer.label = "gold-particle-layer";
  }

  burst(x: number, y: number, color = 0xffd878, count = 18): void {
    const particleCount = this.reducedMotion ? Math.min(5, count) : count;
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 1.2 + Math.random() * 2.7;
      const particle = new Graphics().circle(0, 0, radius).fill({ color, alpha: 0.95 });
      particle.x = x;
      particle.y = y;
      this.layer.addChild(particle);
      const angle = (Math.PI * 2 * index) / particleCount + Math.random() * 0.5;
      const distance = 15 + Math.random() * 48;
      gsap.to(particle, {
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.12,
        duration: 0.38 + Math.random() * 0.48,
        ease: "power2.out",
        onComplete: () => {
          this.layer.removeChild(particle);
          particle.destroy();
        },
      });
    }
  }

  flyCoin(x: number, y: number, targetX: number, targetY: number, delay = 0, duration = 0.62): Promise<void> {
    return new Promise((resolve) => {
      const coin = new Graphics()
        .circle(0, 0, 12)
        .fill({ color: 0xd99a36 })
        .circle(0, 0, 9)
        .fill({ color: 0xffdf77 })
        .circle(0, 0, 6)
        .stroke({ color: 0xfff2b2, width: 1.3 });
      coin.x = x;
      coin.y = y;
      this.layer.addChild(coin);
      gsap.to(coin, {
        x: targetX,
        y: targetY,
        rotation: Math.PI * 3,
        scale: 0.48,
        duration: this.reducedMotion ? 0.25 : duration,
        delay,
        ease: "power2.inOut",
        onComplete: () => {
          this.layer.removeChild(coin);
          coin.destroy();
          this.burst(targetX, targetY, 0xffdc78, this.reducedMotion ? 4 : 9);
          resolve();
        },
      });
    });
  }

  clear(): void {
    for (const child of this.layer.removeChildren()) child.destroy({ children: true });
  }
}
