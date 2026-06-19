const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["src/extension.js"],
    bundle: true,
    outfile: "out/extension.js",
    platform: "node",
    format: "cjs",
    external: ["vscode"],
    sourcemap: true,
    minify: false,
  })
  .then(() => console.log("Build complete"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
