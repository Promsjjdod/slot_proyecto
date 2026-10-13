import { Howl, Howler } from "howler";

export type SfxName =
  "click" | "spin" | "reel-stop" | "coin" | "pot-up" | "win" | "bonus" | "jackpot" | "anticipation" | "ambient";

const SFX_FILES: Record<SfxName, string> = {
  click: "ui-click.mp3",
  spin: "spin-start.mp3",
  "reel-stop": "reel-stop.mp3",
  coin: "coin-cascade.mp3",
  "pot-up": "pot-rise.mp3",
  win: "win-chime.mp3",
  bonus: "bonus-transition.mp3",
  jackpot: "jade-jackpot.mp3",
  anticipation: "anticipation.mp3",
  ambient: "night-ambience.mp3",
};

export interface AudioPreferences {
  sound: boolean;
  music: boolean;
  muted: boolean;
  volume: number;
}

export class AudioManager {
  private readonly preferences: AudioPreferences;
  private readonly effects = new Map<SfxName, Howl>();
  private baseMusic: Howl | null = null;
  private featureMusic: Howl | null = null;
  private unlocked = false;
  private activeLoop: "base" | "feature" = "base";

  constructor(preferences: AudioPreferences) {
    this.preferences = preferences;
  }

  async unlock(): Promise<void> {
    if (this.unlocked) {
      this.syncSettings();
      return;
    }
    this.unlocked = true;
    Howler.autoUnlock = true;
    Howler.html5PoolSize = 16;
    Howler.volume(this.preferences.volume);

    const audioBase = `${import.meta.env.BASE_URL}assets/audio/`;
    this.baseMusic = this.makeHowl(`${audioBase}base-loop.mp3`, true, 0.24);
    this.featureMusic = this.makeHowl(`${audioBase}hold-spin-loop.mp3`, true, 0.31);
    for (const [name, file] of Object.entries(SFX_FILES) as [SfxName, string][]) {
      this.effects.set(name, this.makeHowl(`${audioBase}${file}`, false, this.effectVolume(name)));
    }
    await this.syncSettings();
    if (this.preferences.sound && !this.preferences.muted) this.effects.get("ambient")?.play();
  }

  play(name: SfxName): void {
    if (!this.unlocked || !this.preferences.sound || this.preferences.muted) return;
    const sound = this.effects.get(name);
    if (!sound) return;
    sound.volume(this.effectVolume(name));
    sound.play();
  }

  setMusicEnabled(enabled: boolean): void {
    this.preferences.music = enabled;
    if (this.unlocked) void this.syncSettings();
  }

  setSoundEnabled(enabled: boolean): void {
    this.preferences.sound = enabled;
    if (this.unlocked && !enabled) for (const sound of this.effects.values()) sound.stop();
    if (this.unlocked) void this.syncSettings();
  }

  setMuted(muted: boolean): void {
    this.preferences.muted = muted;
    if (this.unlocked) void this.syncSettings();
  }

  setVolume(volume: number): void {
    this.preferences.volume = Math.max(0, Math.min(1, volume));
    if (this.unlocked) void this.syncSettings();
  }

  enterFeature(): void {
    this.activeLoop = "feature";
    this.crossfadeLoops();
  }

  exitFeature(): void {
    this.activeLoop = "base";
    this.crossfadeLoops();
  }

  duckMusic(ducked: boolean): void {
    if (!this.preferences.music) return;
    const target = this.activeLoop === "base" ? this.baseMusic : this.featureMusic;
    if (!target || !target.playing()) return;
    const volume = ducked ? 0.08 : this.activeLoop === "base" ? 0.24 : 0.31;
    target.fade(target.volume(), volume, ducked ? 220 : 650);
  }

  dispose(): void {
    for (const sound of this.effects.values()) sound.unload();
    this.baseMusic?.unload();
    this.featureMusic?.unload();
    this.effects.clear();
  }

  private async syncSettings(): Promise<void> {
    if (!this.unlocked) return;
    Howler.volume(this.preferences.volume);
    Howler.mute(this.preferences.muted);
    if (!this.preferences.music) {
      this.baseMusic?.pause();
      this.featureMusic?.pause();
      return;
    }
    const active = this.activeLoop === "base" ? this.baseMusic : this.featureMusic;
    const inactive = this.activeLoop === "base" ? this.featureMusic : this.baseMusic;
    inactive?.pause();
    if (active && !active.playing()) {
      active.volume(0);
      active.play();
      active.fade(0, this.activeLoop === "base" ? 0.24 : 0.31, 900);
    }
  }

  private crossfadeLoops(): void {
    if (!this.unlocked || !this.preferences.music) return;
    const active = this.activeLoop === "base" ? this.baseMusic : this.featureMusic;
    const inactive = this.activeLoop === "base" ? this.featureMusic : this.baseMusic;
    if (inactive?.playing()) {
      inactive.fade(inactive.volume(), 0, 650);
      window.setTimeout(() => inactive.pause(), 680);
    }
    if (active && !active.playing()) {
      active.volume(0);
      active.play();
    }
    if (active) {
      const volume = this.activeLoop === "base" ? 0.24 : 0.31;
      active.fade(active.volume(), volume, 800);
    }
  }

  private makeHowl(src: string, loop: boolean, volume: number): Howl {
    return new Howl({
      src: [src],
      format: ["mp3"],
      loop,
      preload: true,
      volume,
      html5: false,
      onloaderror: (_id, error) => {
        console.warn("Audio asset could not load.", error);
      },
      onplayerror: (_id, error) => {
        console.warn("Procedural audio could not start in this browser.", error);
      },
    });
  }

  private effectVolume(name: SfxName): number {
    const base = name === "ambient" ? 0.16 : name === "jackpot" || name === "bonus" ? 0.52 : 0.34;
    return base;
  }
}
