import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "../..");
const outputDirectory = path.join(root, "docs/design-system");
const sourceDirectory = path.join(directory, "src");
const assetsDirectory = path.join(outputDirectory, "assets");
const examplesDirectory = path.join(sourceDirectory, "components/examples");
const exampleFiles = (await readdir(examplesDirectory)).filter((name) => name.endsWith("-demo.tsx"));
const sources = Object.fromEntries(await Promise.all(exampleFiles.map(async (filename) => [
  filename.replace("-demo.tsx", ""),
  await readFile(path.join(examplesDirectory, filename), "utf8"),
])));

await mkdir(assetsDirectory, { recursive: true });
const temporaryDirectory = await mkdtemp(path.join(directory, ".build-"));
const common = {
  absWorkingDir: root,
  bundle: true,
  tsconfig: path.join(directory, "tsconfig.json"),
  target: "es2022",
  define: {
    "process.env.NODE_ENV": '"production"',
    __DEMO_SOURCES__: JSON.stringify(sources),
  },
  // Keep CSS Module names identical in the HTML renderer and browser bundle.
  minifyIdentifiers: false,
  legalComments: "linked",
};

try {
  const browserBuild = await build({
    ...common,
    entryPoints: [path.join(sourceDirectory, "client.tsx")],
    outfile: path.join(assetsDirectory, "docs.js"),
    platform: "browser",
    format: "iife",
    minifyWhitespace: true,
    minifySyntax: true,
    metafile: true,
  });

  if (Object.keys(browserBuild.metafile.inputs).some((name) => name.includes("node_modules/next/"))) {
    throw new Error("Standalone documentation must not include the Next.js runtime.");
  }

  await build({
    ...common,
    entryPoints: [path.join(sourceDirectory, "render.tsx")],
    outfile: path.join(temporaryDirectory, "render.mjs"),
    platform: "node",
    format: "esm",
    packages: "external",
  });

  const globalsPath = path.join(root, "src/app/globals.css");
  const globals = (await readFile(globalsPath, "utf8")).replace(
    '@import "tailwindcss";',
    '@import "tailwindcss" source(none);\n@source "../../scripts/design-system/src";\n@source "../components/ui";',
  );
  const css = await postcss([tailwindcss({ base: root, optimize: { minify: true } })]).process(
    `${globals}\n:root { --font-korean: "Apple SD Gothic Neo", "Malgun Gothic"; --font-geist-sans: Arial, sans-serif; --font-geist-mono: "SFMono-Regular", Consolas, monospace; }`,
    { from: globalsPath },
  );
  await writeFile(path.join(assetsDirectory, "tokens.css"), css.css);

  const { renderPages } = await import(pathToFileURL(path.join(temporaryDirectory, "render.mjs")).href);
  const documents = renderPages();
  await Promise.all(documents.map(({ filename, html }) => writeFile(path.join(outputDirectory, filename), html)));
  console.log(`Exported ${documents.length} HTML documents to docs/design-system/`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
