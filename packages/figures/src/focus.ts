/**
 * Keep keyboard focus when a pressed button disables or removes itself.
 *
 * "Next →" on the last step, "Restore original" once restored, "Check the
 * checksum" once checked: the browser drops focus to <body>, and a keyboard or
 * screen-reader user is thrown back to the top of the page. Attach this as the
 * hero root's onClickCapture (Enter and Space on a button also fire click).
 * Capture, not bubble: for a real user event Preact re-renders in the
 * microtask after the button's own handler, so by the bubble phase a removed
 * button is already detached and its group cannot be found. After the
 * re-render, if focus fell out, it moves to the nearest
 * enabled button in the same group, or else to the pressed button's closest
 * [data-focus-home] element (which needs tabIndex -1).
 */
export function holdFocus(event: MouseEvent) {
  const button = (event.target as Element | null)?.closest?.("button");
  if (!button) return;
  const group = button.closest<HTMLElement>('[role="group"]') ?? button.parentElement;
  const home = button.closest<HTMLElement>("[data-focus-home]");
  const siblings = group ? [...group.querySelectorAll("button")] : [];
  const at = siblings.indexOf(button);
  setTimeout(() => {
    const active = document.activeElement;
    if (button.isConnected && !button.disabled) return;
    if (active && active !== document.body && active !== button) return;
    // Nearest enabled sibling, looking outwards from the pressed button.
    for (let d = 1; d < siblings.length; d++) {
      for (const i of [at - d, at + d]) {
        const b = siblings[i];
        if (b && b.isConnected && !b.disabled) return b.focus();
      }
    }
    const fallback = group?.isConnected ? group.querySelector<HTMLButtonElement>("button:not([disabled])") : null;
    if (fallback) return fallback.focus();
    if (home?.isConnected) home.focus();
  });
}
