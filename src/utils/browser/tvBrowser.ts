const TV_USER_AGENT = /Tizen|Web[0O]S/i;

export function isTvBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return TV_USER_AGENT.test(navigator.userAgent || "");
}
