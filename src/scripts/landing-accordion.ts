/*
  Height animation for the science accordion.

  The markup is <details name="science">, so opening, closing and one-panel-at-a-time
  all work with no JavaScript — a <details> element simply cannot transition its
  own height. This module adds that transition on top, which is why it takes over
  the toggle rather than replacing it.
*/

const DURATION = 500;
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

export function initLandingAccordion(): void {
  const rows = Array.from(document.querySelectorAll<HTMLDetailsElement>(".l-acc__row"));
  if (rows.length === 0) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  rows.forEach((row) => {
    const panel = row.querySelector<HTMLElement>(".l-acc__panel");
    const summary = row.querySelector("summary");
    if (!panel || !summary) return;

    let animation: Animation | null = null;

    function animate(to: "open" | "close"): void {
      animation?.cancel();
      const height = panel.scrollHeight;
      const frames =
        to === "open"
          ? [
              { height: "0px", opacity: 0 },
              { height: `${height}px`, opacity: 1 },
            ]
          : [
              { height: `${height}px`, opacity: 1 },
              { height: "0px", opacity: 0 },
            ];

      animation = panel.animate(frames, { duration: DURATION, easing: EASE });
      animation.onfinish = () => {
        animation = null;
        /* The open attribute is what actually holds the row's state; the animation
           is only the transition into it. */
        if (to === "close") row.open = false;
      };
    }

    summary.addEventListener("click", (event) => {
      event.preventDefault();

      if (row.open) {
        animate("close");
        return;
      }

      /* `name` gives exclusivity for free, but only when the browser flips `open`
         itself. Taking over the click means closing the open sibling by hand. */
      rows
        .filter((other) => other !== row && other.open)
        .forEach((other) => {
          const otherPanel = other.querySelector<HTMLElement>(".l-acc__panel");
          if (!otherPanel) {
            other.open = false;
            return;
          }
          otherPanel
            .animate(
              [
                { height: `${otherPanel.scrollHeight}px`, opacity: 1 },
                { height: "0px", opacity: 0 },
              ],
              { duration: DURATION, easing: EASE }
            )
            .addEventListener("finish", () => {
              other.open = false;
            });
        });

      row.open = true;
      animate("open");
    });
  });
}
