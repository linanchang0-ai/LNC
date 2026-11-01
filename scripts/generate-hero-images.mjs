import path from "node:path";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const sourceDirectory = path.resolve("imeg");
const outputDirectory = path.resolve("public/hero");
const scenes = [
  { name: "noche", source: "1 (1).jpg" },
  { name: "mediodia", source: "1 (2).jpg" },
  { name: "manana", source: "1 (3).jpg" },
  { name: "atardecer", source: "1 (4).jpg" },
];

await mkdir(outputDirectory, { recursive: true });

for (const scene of scenes) {
  const input = path.join(sourceDirectory, scene.source);
  const mobile = sharp(input).resize(1080, 1920, { fit: "cover", position: "centre" });
  const desktopBackground = await sharp(input)
    .resize(1920, 1080, { fit: "cover", position: "centre" })
    .blur(28)
    .modulate({ brightness: 0.72, saturation: 0.82 })
    .toBuffer();
  const desktopScene = await sharp(input)
    .resize({ height: 1080, fit: "contain" })
    .toBuffer();

  await Promise.all([
    mobile.webp({ quality: 82, effort: 5 }).toFile(path.join(outputDirectory, `${scene.name}-mobile.webp`)),
    sharp(desktopBackground)
      .composite([{ input: desktopScene, gravity: "centre" }])
      .webp({ quality: 84, effort: 5 })
      .toFile(path.join(outputDirectory, `${scene.name}-desktop.webp`)),
  ]);
}