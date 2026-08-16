export function isNavDebugEnabled(): boolean {
  try {
    if (window.location.search.indexOf("navdebug=1") !== -1) return true;
    return window.localStorage.getItem("navdebug") === "1";
  } catch {
    return false;
  }
}

/** Loads and starts the probe if the flag is set. Otherwise does nothing. */
export function initNavDebug(): void {
  if (!isNavDebugEnabled()) return;
  import("./navDebugProbe")
    .then((probe) => probe.startNavDebug())
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[navdebug] failed to load", err);
    });
}
