import type { Plugin, Rule } from "postcss";


const MODALITY = '[data-input-modality="key"]';

export interface HoverToFocusOptions {
  focusWithin?: boolean;
}

function scopeToKeyModality(selector: string): string | null {
  const trimmed = selector.trim();

  if (/::-/.test(trimmed)) return null;

  const rooted = /^(html|:root|\[dir[^\]]*\])/.exec(trimmed);
  if (rooted) {
    return trimmed.slice(0, rooted[0].length) + MODALITY + trimmed.slice(rooted[0].length);
  }

  return `html${MODALITY} ${trimmed}`;
}

export function hoverToFocus(options: HoverToFocusOptions = {}): Plugin {
  const focusWithin = options.focusWithin ?? true;

  return {
    postcssPlugin: "hover-to-focus",
    OnceExit(root) {
      const clones: Array<{ anchor: Rule; clone: Rule }> = [];

      root.walkRules(/:hover\b/, (rule) => {
        const scoped: string[] = [];

        for (const selector of rule.selectors) {
          if (!/:hover\b/.test(selector)) continue;

          const focus = scopeToKeyModality(selector.replace(/:hover\b/g, ":focus"));
          if (focus) scoped.push(focus);

          if (focusWithin) {
            const within = scopeToKeyModality(
              selector.replace(/:hover\b/g, ":focus-within"),
            );
            if (within) scoped.push(within);
          }
        }

        if (scoped.length === 0) return;
        clones.push({ anchor: rule, clone: rule.clone({ selector: scoped.join(", ") }) });
      });

      // Inserted after the walk so the clones aren't themselves walked.
      clones.forEach(({ anchor, clone }) => anchor.after(clone));
    },
  };
}
