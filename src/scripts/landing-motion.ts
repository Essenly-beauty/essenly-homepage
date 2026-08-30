/*
  The landing page's motion layer: Lenis smooth scroll plus every ScrollTrigger.
  See docs/superpowers/specs/2026-08-03-pef-style-redesign-design.md

  Nothing here is required for the page to be readable. The stylesheet renders a
  correct static page on its own, and this module only takes over once it has
  added `html.motion` — so a load failure, reduced-motion preference, or a narrow
  viewport all degrade to that static page rather than to a broken one.

  Everything is registered inside a gsap.matchMedia() block, which means crossing
  the desktop breakpoint or switching on reduced motion tears the whole layer down
  — triggers reverted, Lenis destroyed, the ticker callback removed. Hand-rolled
  resize handling let Lenis keep hijacking the scroll at mobile widths.
*/
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

const DESKTOP = "(min-width: 1280px) and (prefers-reduced-motion: no-preference)";

/** Scroll position, in px, at which the header leaves the open hero and locks. */
const HEADER_LOCK_SCROLL = 260;

type Rect = { left: number; top: number; width: number; height: number };

const px = (n: number) => `${n}px`;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* The viewport a fixed element is actually laid out in. window.innerWidth counts
   the scrollbar; documentElement.clientWidth does not. On macOS the scrollbar is
   an overlay and the two agree, but on Windows and Linux a classic scrollbar is
   ~15px, and using innerWidth would centre the resting hero ~7px right of the
   content column and push the fullscreen hero 15px under the scrollbar. */
const viewport = () => ({
  width: document.documentElement.clientWidth,
  height: document.documentElement.clientHeight,
});

function tween(from: Rect, to: Rect, t: number): Rect {
  return {
    left: lerp(from.left, to.left, t),
    top: lerp(from.top, to.top, t),
    width: lerp(from.width, to.width, t),
    height: lerp(from.height, to.height, t),
  };
}

function readVarPx(name: string, fallback: number): number {
  /* The stylesheet expresses these in rem, and rem is viewport-derived here, so
     they have to be resolved against the live root font-size rather than parsed
     as absolute px. */
  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  if (!raw) return fallback;
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return fallback;
  if (raw.endsWith("rem")) return value * Number.parseFloat(getComputedStyle(root).fontSize);
  if (raw.endsWith("vh")) return (value / 100) * window.innerHeight;
  return value;
}

export function initLandingMotion(): void {
  const heroBg = document.getElementById("l-hero-bg");
  const header = document.getElementById("l-header");
  const slotA = document.getElementById("l-slot-a");
  const slotB = document.getElementById("l-slot-b");
  if (!heroBg || !header || !slotA) return;

  gsap.registerPlugin(ScrollTrigger);

  gsap.matchMedia().add(DESKTOP, () => {
    document.documentElement.classList.add("motion");

    /* ---- Lenis, driven by GSAP's ticker so scrub stays in step with scroll ---- */

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    const raf = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const onAnchorClick = (event: Event) => {
      const link = (event.currentTarget as HTMLAnchorElement).getAttribute("href");
      if (!link || link === "#") return;
      const target = document.querySelector(link);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -readVarPx("--header-h", 52) });
    };

    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    anchors.forEach((a) => a.addEventListener("click", onAnchorClick));

    /* ---- Hero: expand to fullscreen, hold, then morph into the headline slot ----

       The resting rect is read from the stylesheet rather than restated here, so
       the 1258x642rem figures live in exactly one place. */

    let restRect: Rect = { left: 0, top: 0, width: 0, height: 0 };

    const measureRest = () => {
      const w = readVarPx("--hero-w", 943);
      const h = readVarPx("--hero-h", 481);
      const vp = viewport();
      restRect = { width: w, height: h, left: (vp.width - w) / 2, top: vp.height - h };
    };

    const fullRect = (): Rect => {
      const vp = viewport();
      return { left: 0, top: 0, width: vp.width, height: vp.height };
    };

    const applyRect = (rect: Rect) => {
      heroBg.style.left = px(rect.left);
      heroBg.style.top = px(rect.top);
      heroBg.style.width = px(rect.width);
      heroBg.style.height = px(rect.height);
    };

    measureRest();
    applyRect(restRect);

    /* The hold phase needs no code: the track reserves expand + hold height, the
       expand trigger finishes after `expand`, and the morph does not begin until
       #l-info reaches the viewport bottom. The gap between them is the hold. */
    const expandScroll = readVarPx("--hero-expand-scroll", 480);

    const expandSt = ScrollTrigger.create({
      trigger: "#l-hero-track",
      start: "top bottom",
      end: `top bottom-=${expandScroll}`,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        /* The morph owns the rect once it is running; bailing out here keeps the
           two triggers from fighting over the same four properties in the frames
           where their ranges touch. */
        if (heroBg.dataset.phase === "morph") return;
        applyRect(tween(restRect, fullRect(), self.progress));
      },
    });

    ScrollTrigger.create({
      trigger: "#l-info",
      start: "top bottom",
      end: "top top",
      scrub: true,
      invalidateOnRefresh: true,
      onEnter: () => {
        heroBg.dataset.phase = "morph";
      },
      onLeaveBack: () => {
        /* Reversing has to restore the fullscreen state rather than snap: hand the
           rect back to the expand trigger and re-hide the inline image. */
        heroBg.dataset.phase = "expand";
        heroBg.classList.remove("is-morphed");
        slotA.classList.remove("is-revealed");
        measureRest();
        applyRect(tween(restRect, fullRect(), expandSt.progress));
      },
      onUpdate: (self) => {
        const target = slotA.getBoundingClientRect();
        applyRect(
          tween(
            fullRect(),
            { left: target.left, top: target.top, width: target.width, height: target.height },
            self.progress
          )
        );
        const landed = self.progress >= 0.995;
        heroBg.classList.toggle("is-morphed", landed);
        slotA.classList.toggle("is-revealed", landed);
      },
    });

    /* The second slot has no hero to receive, so it fades in on its own — early
       enough (72% of the viewport) that the headline never shows a hole while
       being read. */
    if (slotB) {
      ScrollTrigger.create({
        trigger: "#l-info",
        start: "top 68%",
        onEnter: () => slotB.classList.add("is-revealed"),
        onLeaveBack: () => slotB.classList.remove("is-revealed"),
      });
    }

    /* ---- Header lock ----

       The lockup no longer opens oversized and shrinks — it is type now, at one
       size — so this only marks the moment the header stops sitting over the
       open hero and earns its frosted bar.

       start is a plain number, which ScrollTrigger reads as an absolute scroll
       position. A `trigger: "body"` element never fired here: body's measured
       box under a fixed-position hero does not line up with scroll 0 the way the
       start/end keywords assume. */

    ScrollTrigger.create({
      start: HEADER_LOCK_SCROLL,
      onEnter: () => header.classList.add("is-locked"),
      onLeaveBack: () => header.classList.remove("is-locked"),
    });

    /* ---- Rise reveals ----

       Retuned after scrolling the shipped page: content was appearing after the
       reader had already gone past it. Three coupled causes, three changes:

       - The trigger watches the outer `.rise` clip, not the inner. ScrollTrigger
         measures an element where it currently is, and the inner was
         pre-translated 110% of its own height — so a 900px pictorial image's
         trigger sat 990px below its visible slot and did not fire until the
         empty slot was already leaving the top of the viewport.
       - The start offset is capped at 96px. Text lines are shorter than the cap
         and keep their full masked slide; media no longer travels its own height
         and is in place a beat after it enters.
       - Triggers fire at the viewport edge, and a fast flick gets the short
         tween, so reveals never trail the scroll. */

    const RISE_MAX = 96;
    const riseOffset = (_i: number, el: any) =>
      Math.min((el as HTMLElement).clientHeight * 1.1, RISE_MAX);
    const innersOf = (batch: Element[]) =>
      batch
        .map((el) => el.querySelector<HTMLElement>(":scope > .rise-inner"))
        .filter((el): el is HTMLElement => Boolean(el));

    gsap.set(".rise-inner", { y: riseOffset, opacity: 0 });

    /* 92%, not the literal edge: firing at 100% finished the motion right at the
       fold, which read as slightly premature — the entrance was over before the
       eye caught it. 8% of travel first puts the movement where it is seen. */
    ScrollTrigger.batch(".rise", {
      start: "top 92%",
      interval: 0.05,
      batchMax: 6,
      onEnter: (batch, triggers) => {
        const fast = Math.abs(triggers[0]?.getVelocity() ?? 0) > 1600;
        gsap.to(innersOf(batch), {
          y: 0,
          opacity: 1,
          duration: fast ? 0.35 : 0.6,
          stagger: fast ? 0.02 : 0.06,
          ease: "power3.out",
          overwrite: true,
        });
      },
      onLeaveBack: (batch) =>
        gsap.to(innersOf(batch), {
          y: riseOffset,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          overwrite: true,
        }),
    });

    /* Backstop: no slot may still be empty once it reaches 70% of the viewport,
       regardless of scroll velocity. Time-based reveals can always be outrun by
       a hard enough flick; this force-completes whatever is still mid-tween the
       moment the slot crosses the line where the eye lands. Per element and
       unbatched on purpose — the batching interval that makes the entrance wave
       pleasant is exactly the latency that cannot be afforded here. For anything
       already revealed it retargets the finished values, a visual no-op. */
    document.querySelectorAll<HTMLElement>(".rise").forEach((outer) => {
      const inner = outer.querySelector<HTMLElement>(":scope > .rise-inner");
      if (!inner) return;
      ScrollTrigger.create({
        trigger: outer,
        start: "top 70%",
        onEnter: (self) => {
          const violent = Math.abs(self.getVelocity()) > 4000;
          gsap.to(inner, {
            y: 0,
            opacity: 1,
            duration: violent ? 0.12 : 0.22,
            ease: "power2.out",
            overwrite: true,
          });
        },
      });
    });

    /* ---- Philosophy: light each line as it arrives ----

       Triggered off each line's `.rise` clip — the line span itself sits inside
       a translated inner, which would skew the measurement — and at 80% of the
       viewport, so a line is already white before the eye reaches it
       mid-screen rather than lighting at the bottom edge. */

    const lines = Array.from(document.querySelectorAll<HTMLElement>(".l-philosophy__line"));
    lines.forEach((line) => {
      ScrollTrigger.create({
        trigger: line.closest(".rise") ?? line,
        start: "top 77%",
        onEnter: () => line.classList.add("is-lit"),
        onLeaveBack: () => line.classList.remove("is-lit"),
      });
    });

    ScrollTrigger.addEventListener("refreshInit", measureRest);
    ScrollTrigger.refresh();

    return () => {
      /* gsap.matchMedia reverts the triggers and tweens it created; the rest of
         this — the ticker callback, Lenis, the listeners, the inline rect and the
         state classes — is ours to undo. */
      ScrollTrigger.removeEventListener("refreshInit", measureRest);
      anchors.forEach((a) => a.removeEventListener("click", onAnchorClick));
      gsap.ticker.remove(raf);
      lenis.destroy();

      heroBg.removeAttribute("style");
      delete heroBg.dataset.phase;
      heroBg.classList.remove("is-morphed");
      slotA.classList.remove("is-revealed");
      slotB?.classList.remove("is-revealed");
      header.classList.remove("is-locked");
      lines.forEach((line) => line.classList.remove("is-lit"));
      document.documentElement.classList.remove("motion");
    };
  });
}
