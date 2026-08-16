interface ScopeEntry {
  el: HTMLElement;
}

const stack: ScopeEntry[] = [];

function prune() {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (!stack[i].el.isConnected) stack.splice(i, 1);
  }
}

export function pushScope(el: HTMLElement): () => void {
  const entry: ScopeEntry = { el };
  stack.push(entry);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const index = stack.indexOf(entry);
    if (index !== -1) stack.splice(index, 1);
  };
}

/** The innermost registered scope, or null when focus is unconstrained. */
export function getActiveScope(): HTMLElement | null {
  prune();
  if (stack.length === 0) return null;
  return stack[stack.length - 1].el;
}

/** Number of live scopes. Exposed for tests and the nav debug probe. */
export function getScopeDepth(): number {
  prune();
  return stack.length;
}
