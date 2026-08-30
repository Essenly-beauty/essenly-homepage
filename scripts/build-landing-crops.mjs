/*
  Builds every photo the landing page publishes.

  assets/source-photos/ holds the untouched originals and is outside public/, so
  none of it is deployed. public/images/essenly/*.jpg is entirely generated from
  it by this script. Keeping the two apart is what makes the script idempotent:
  a crop always reads a full-resolution original, never a derivative it produced
  on a previous run.

  The derivatives are committed, because the deploy runs `npm run build`, not
  this. Re-run `npm run crops` after touching a source photo or a window here.

  The two model photos carry a decorative orange frame baked into the image, and
  the hair micrograph carries "Before" / "After 1 use" captions, so the crop
  windows below are placed to land inside the frame and clear of the captions
  rather than centred.
*/
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SRC = "assets/source-photos";
const OUT = "public/images/essenly";

/* Cropped derivatives. */
const CROPS = [
  // Brand band: wide strip from the model close-up, inside the frame, biased to
  // the dark-hair side so the white overlay type has something to sit on.
  {
    from: "essenly-wholesale-hero.jpg",
    to: "essenly-band-wide.jpg",
    crop: { left: 150, top: 260, width: 1000, height: 560 },
  },
  // Pictorial portrait. Taken from the close-up rather than essenly-hair-ritual.jpg,
  // whose frame sweeps across both its top-left and right edges — no usable tall
  // crop survives inside it.
  {
    from: "essenly-wholesale-hero.jpg",
    to: "essenly-portrait-model.jpg",
    crop: { left: 160, top: 200, width: 780, height: 1010 },
  },
  // Inline headline slots: 2.15:1, matching the reference's 215x100 slot.
  // Slot A is cropped from the hero photo on purpose — it is what the hero morphs
  // into, so landing on a different picture would read as a jump cut.
  {
    from: "essenly-product-hero.jpg",
    to: "essenly-inline-a.jpg",
    crop: { left: 300, top: 180, width: 1000, height: 465 },
  },
  // Slot B is the dark counterweight in the headline. A pixel scan of this band
  // puts the source's right-hand caption leader at x=1125, so the window has to
  // end before it; at left:300 the crop embedded a stray white dash and half an
  // "A" inside the h1.
  {
    from: "essenly-texture-macro.jpg",
    to: "essenly-inline-b.jpg",
    crop: { left: 110, top: 460, width: 1000, height: 465 },
  },
  // Archive secondary: portrait crop of the splash shot.
  {
    from: "essenly-product-hero.jpg",
    to: "essenly-archive-b.jpg",
    crop: { left: 420, top: 0, width: 760, height: 960 },
  },
];

/* Photos that ship whole, capped at the width they are actually rendered near.
   The pictorial row is three cells of 100vw/3, so even at the top of the
   unclamped desktop range (2554px) a cell is ~851px — a 1600px source spends
   more than half its bytes on pixels the browser discards. */
const WHOLE = [
  { name: "essenly-product-hero.jpg", maxWidth: 1400 }, // also the hero card, ~943px at 1440
  { name: "essenly-product-texture.jpg", maxWidth: 1200 },
  { name: "essenly-texture-macro.jpg", maxWidth: 1200 },
  { name: "essenly-product-detail.jpg", maxWidth: 1200 },
  { name: "essenly-product-primary.jpg", maxWidth: 1400 }, // wider archive cell
];

const kb = (n) => `${Math.round(n / 1024)}KB`;

for (const job of CROPS) {
  const source = `${SRC}/${job.from}`;
  const meta = await sharp(source).metadata();
  const { left, top, width, height } = job.crop;
  if (left + width > meta.width || top + height > meta.height) {
    throw new Error(
      `${job.from} is ${meta.width}x${meta.height}; crop ${left},${top} ${width}x${height} falls outside it`
    );
  }
  const out = await sharp(source)
    .extract(job.crop)
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  await writeFile(`${OUT}/${job.to}`, out);
  console.log(`crop    ${job.to.padEnd(30)} ${width}x${height}  ${kb(out.length)}  <- ${job.from}`);
}

for (const { name, maxWidth } of WHOLE) {
  const source = `${SRC}/${name}`;
  const meta = await sharp(source).metadata();
  const before = (await readFile(source)).length;
  const out = await sharp(source)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
  await writeFile(`${OUT}/${name}`, out);
  const w = Math.min(meta.width, maxWidth);
  console.log(
    `resize  ${name.padEnd(30)} ${meta.width}->${w}px  ${kb(before)} -> ${kb(out.length)}`
  );
}
