// The bakery's photos and logo mark, made ahead with fal (flux/schnell, about 0.3¢ each). One style prompt for all.
// The fal key never appears here: the network proxy (cloud) or FAL_KEY (demo machine) supplies it.
//   NODE_USE_ENV_PROXY=1 node deploy/make-images.mjs
import fs from 'node:fs';
const OUT = new URL('./app/public/img/', import.meta.url).pathname;
const STYLE = 'soft morning window light from the left, flour-dusted linen on an old wooden table, close and appetising, shallow depth of field, natural warm colours, editorial food photography, no text, no letters, no labels, no people';
const SHOTS = {
  sourdough: `a round country sourdough loaf with a deep crackled crust and one curved score, ${STYLE}`,
  rye: `a dark seeded rye loaf, sliced once to show the dense crumb, sunflower and pumpkin seeds on top, ${STYLE}`,
  brioche: `a golden plaited butter brioche loaf with a glossy egg-washed top, ${STYLE}`,
  logo: 'a simple one-colour logo mark: a single wheat ear drawn with a brush in deep crust brown on a plain cream background, flat, centred, minimal, no text, no letters, no circle, no border',
};
const key = process.env.FAL_KEY || 'placeholder';
for (const [name, prompt] of Object.entries(SHOTS)) {
  const t0 = Date.now();
  const r = await fetch('https://fal.run/fal-ai/flux/schnell', { method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: name === 'logo' ? 'square' : 'landscape_4_3', num_images: 1, num_inference_steps: 4, seed: 7, output_format: 'jpeg' }) });
  if (!r.ok) { console.error(name, 'fal', r.status); process.exitCode = 1; continue; }
  const j = await r.json();
  const img = await fetch(j.images[0].url);
  fs.writeFileSync(OUT + name + '.jpg', Buffer.from(await img.arrayBuffer()));
  console.log(`${name}: ${j.images[0].width}x${j.images[0].height} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
