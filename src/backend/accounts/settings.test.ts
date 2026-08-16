/* eslint-disable import/no-extraneous-dependencies */
import { describe, expect, it } from "vitest";

import { buildFullSettingsInput } from "@/backend/accounts/settings";
import { SETTINGS_FIELDS } from "@/hooks/useSettingsState";
import { usePreferencesStore } from "@/stores/preferences";

describe("settings sync", () => {
  const extras = {
    applicationTheme: null,
    applicationLanguage: "en",
    defaultSubtitleLanguage: "en",
  };

  it("sends every field the save button tracks", () => {
    const payload = buildFullSettingsInput(
      usePreferencesStore.getState(),
      extras,
    );

    const missing = SETTINGS_FIELDS.map((f) => f.backendKey).filter(
      (key) => !(key in payload),
    );

    expect(missing).toEqual([]);
  });

  it("carries the directional navigation preference", () => {
    const payload = buildFullSettingsInput(
      usePreferencesStore.getState(),
      extras,
    );

    expect(payload.spatialNavigation).toBe("off");
    expect(SETTINGS_FIELDS.some((f) => f.key === "spatialNavigation")).toBe(
      true,
    );
  });
});
