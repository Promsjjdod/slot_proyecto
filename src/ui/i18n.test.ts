import { describe, expect, it } from "vitest";
import { renderDialogPanel } from "./dialog-panels";
import { formatMessage, translate } from "./i18n";

describe("English and Spanish game copy", () => {
  it("keeps the entertainment-only demo disclaimer clear in both languages", () => {
    expect(translate("es", "responsibleShort")).toBe("DEMO – SIN DINERO REAL");
    expect(translate("en", "responsibleShort")).toBe("DEMO – NO REAL MONEY");
  });

  it("formats the bonus purchase confirmation with localized text", () => {
    expect(formatMessage("es", "confirmBuyText", { cost: "535", multiplier: 535 })).toContain("créditos virtuales");
    expect(formatMessage("en", "confirmBuyText", { cost: "535", multiplier: 535 })).toContain("virtual credits");
  });

  it("localizes the paytable and settings panels in English", () => {
    const settings = {
      sound: true,
      music: true,
      muted: false,
      vibration: true,
      quality: "high" as const,
      language: "en" as const,
      volume: 0.72,
    };
    const credits = (value: number): string => String(value);
    const paytable = renderDialogPanel("paytable", "en", settings, [], credits);
    const settingsPanel = renderDialogPanel("settings", "en", settings, [], credits);

    expect(paytable).toContain("3 REELS");
    expect(paytable).toContain("Golden dragon");
    expect(paytable).toContain("Pays are multiplied by the bet.");
    expect(settingsPanel).toContain("Volume");
    expect(settingsPanel).not.toContain("Volumen");
  });
});
