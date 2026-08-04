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

/** Scroll distance, in px, over which the opening wordmark shrinks to header size. */
const LOGO_SHRINK_RANGE = 260;

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

    /* The second slot has no hero to receive, so it just reveals on its own. */
    if (slotB) {
      ScrollTrigger.create({
        trigger: "#l-info",
        start: "top center",
        onEnter: () => slotB.classList.add("is-revealed"),
        onLeaveBack: () => slotB.classList.remove("is-revealed"),
      });
    }

    /* ---- Wordmark shrink, then lock ----

       start/end are plain numbers, which ScrollTrigger reads as absolute scroll
       positions. A `trigger: "body"` element never fired here: body's measured
       box under a fixed-position hero does not line up with scroll 0 the way the
       start/end keywords assume. */

    const logo = header.querySelector<HTMLElement>(".l-header__logo");

    if (logo) {
      const logoOpen = readVarPx("--logo-h-open", 225);
      const logoLock = readVarPx("--logo-h-lock", 52);
      const padOpen = readVarPx("--logo-pt-open", 34);
      const padLock = readVarPx("--logo-pt-lock", 13);

      ScrollTrigger.create({
        start: 0,
        end: LOGO_SHRINK_RANGE,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const t = self.progress;
          logo.style.height = px(lerp(logoOpen, logoLock, t));
          logo.style.paddingTop = px(lerp(padOpen, padLock, t));
        },
      });

      /* Locking is a separate trigger so it survives being scrolled past: a
         scrubbed trigger stops updating once you are beyond its end. */
      ScrollTrigger.create({
        start: LOGO_SHRINK_RANGE,
        onEnter: () => {
          header.classList.add("is-locked");
          logo.style.removeProperty("height");
          logo.style.removeProperty("padding-top");
        },
        onLeaveBack: () => header.classList.remove("is-locked"),
      });
    }

    /* ---- Rise reveals ---- */

    ScrollTrigger.batch(".rise-inner", {
      start: "top bottom-=60",
      batchMax: 4,
      onEnter: (batch) =>
        gsap.to(batch, {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
          overwrite: true,
        }),
      onLeaveBack: (batch) =>
        gsap.to(batch, {
          y: "110%",
          opacity: 0,
          duration: 0.4,
          ease: "power2.in",
          overwrite: true,
        }),
    });

    /* ---- Philosophy: light each line as it arrives ---- */

    const lines = Array.from(document.querySelectorAll<HTMLElement>(".l-philosophy__line"));
    lines.forEach((line) => {
      ScrollTrigger.create({
        trigger: line,
        start: "top bottom-=140",
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
      header.querySelector<HTMLElement>(".l-header__logo")?.removeAttribute("style");
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
