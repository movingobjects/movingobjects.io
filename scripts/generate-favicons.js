import favicons from "favicons";
import fs from "fs/promises";
import path from "path";

const src = "./images/favicon.svg";
const dest = "./public";

const configuration = {
  path: "/",
  appName: "Moving Objects",
  appShortName: "Moving Objects",
  appDescription: null,
  background: "#00D96C",
  theme_color: "#00D96C",
  icons: {
    android: false,
    appleIcon: true,
    appleStartup: false,
    favicons: true,
    windows: false,
    yandex: false
  }
};

const response = await favicons(src, configuration);
await fs.mkdir(dest, { recursive: true });

const appleTouchIcons = response.images.filter((image) => {
  if (image.name.startsWith('apple-touch-icon')) {
    return image.name === 'apple-touch-icon-180x180.png';
  }
  return true;
});

await Promise.all(
  appleTouchIcons.map(async (image) => {
    const fileName = image.name === 'apple-touch-icon-180x180.png'
      ? 'apple-touch-icon.png'
      : image.name;
    await fs.writeFile(path.join(dest, fileName), image.contents);
  }),
);

await Promise.all(
  response.files.map(
    async (file) =>
      await fs.writeFile(path.join(dest, file.name), file.contents),
  ),
);

const sourceSvg = await fs.readFile(src);
await fs.writeFile(path.join(dest, "favicon.svg"), sourceSvg);
