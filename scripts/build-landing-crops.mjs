// Regenerates the derived crops the landing page needs.
//
// Sources live in assets/source-photos/ rather than public/, because the two
// full-resolution originals are 684KB combined and nothing on the site links to
// them — left in public/ they were copied into every deploy for nothing.
//
// Both model photos carry a decorative orange frame baked into the image, so
// every crop taken from them starts inside that frame — hence the explicit
// left/top insets rather than a centred crop.
import sharp from "sharp";

const SRC = "assets/source-photos";
const DIR = "public/images/essenly";

/* Photos that ship as-is also serve as crop sources, so a job's input may live in
   either directory. */
const { existsSync } = await import("node:fs");
const resolveSource = (name) => (existsSync(`${SRC}/${name}`) ? `${SRC}/${name}` : `${DIR}/${name}`);
const jobs = [
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
  {
    from: "essenly-texture-macro.jpg",
    to: "essenly-inline-b.jpg",
    crop: { left: 300, top: 460, width: 1000, height: 465 },
  },
  // Archive secondary: portrait crop of the splash shot.
  {
    from: "essenly-product-hero.jpg",
    to: "essenly-archive-b.jpg",
    crop: { left: 420, top: 0, width: 760, height: 960 },
  },
];

for (const job of jobs) {
  const source = resolveSource(job.from);
  const meta = await sharp(source).metadata();
  const { left, top, width, height } = job.crop;
  if (left + width > meta.width || top + height > meta.height) {
    throw new Error(
      `${job.from} is ${meta.width}x${meta.height}; crop ${left},${top} ${width}x${height} falls outside it`
    );
  }
  await sharp(source)
    .extract(job.crop)
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(`${DIR}/${job.to}`);
  console.log(`${job.to}  ${width}x${height}  from ${source} (${meta.width}x${meta.height})`);
}
