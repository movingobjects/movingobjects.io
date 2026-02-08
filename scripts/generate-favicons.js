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
await Promise.all(
  response.images.map(
    async (image) =>
      await fs.writeFile(path.join(dest, image.name), image.contents),
  ),
);
await Promise.all(
  response.files.map(
    async (file) =>
      await fs.writeFile(path.join(dest, file.name), file.contents),
  ),
);

const sourceSvg = await fs.readFile(src);
await fs.writeFile(path.join(dest, "favicon.svg"), sourceSvg);
