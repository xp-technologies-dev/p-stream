/* eslint-disable import/no-extraneous-dependencies */
import { afterEach, describe, expect, it, vi } from "vitest";

import { isTvBrowser } from "./tvBrowser";

function withUserAgent(ua: string) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isTvBrowser", () => {
  it("recognises Tizen", () => {
    withUserAgent(
      "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) 76.0.3809.146/6.0 TV Safari/537.36",
    );
    expect(isTvBrowser()).toBe(true);
  });

  it("recognises webOS, spelled either way", () => {
    withUserAgent(
      "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36 WebAppManager",
    );
    expect(isTvBrowser()).toBe(true);

    withUserAgent(
      "Mozilla/5.0 (webOS/1.4.0; U; en-US) AppleWebKit/532.2 (KHTML, like Gecko) Safari/532.2",
    );
    expect(isTvBrowser()).toBe(true);
  });

  it("does not fire for phones, tablets or desktops", () => {
    withUserAgent(
      "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
    );
    expect(isTvBrowser()).toBe(false);

    withUserAgent(
      "Mozilla/5.0 (Linux; Android 9; KFTRWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/119.3.4 like Chrome/119.0.6045.163 Safari/537.36",
    );
    expect(isTvBrowser()).toBe(false);

    withUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    );
    expect(isTvBrowser()).toBe(false);
  });

  it("says no rather than throwing on an empty user agent", () => {
    withUserAgent("");
    expect(isTvBrowser()).toBe(false);
  });
});
