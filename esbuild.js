// Build script para a extensão e o webview usando esbuild.
// - extension: roda no Node, formato CJS, "vscode" externo.
// - webview: roda no browser do Webview, formato IIFE, com CSS embutido.
const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const extensionConfig = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  platform: "node",
  format: "cjs",
  target: "node18",
  external: ["vscode"],
  sourcemap: !production,
  minify: production,
  logLevel: "info",
};

/** @type {import('esbuild').BuildOptions} */
const webviewConfig = {
  entryPoints: ["src/webview/index.tsx"],
  bundle: true,
  outfile: "dist/webview.js",
  platform: "browser",
  format: "iife",
  target: "es2020",
  sourcemap: !production,
  minify: production,
  logLevel: "info",
  // Necessário para algumas libs que checam process.env.NODE_ENV (ex.: React).
  define: {
    "process.env.NODE_ENV": production ? '"production"' : '"development"',
  },
  loader: {
    ".css": "css",
  },
};

async function main() {
  if (watch) {
    const ctxExt = await esbuild.context(extensionConfig);
    const ctxWeb = await esbuild.context(webviewConfig);
    await Promise.all([ctxExt.watch(), ctxWeb.watch()]);
    console.log("[esbuild] watching...");
  } else {
    await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
    ]);
    console.log("[esbuild] build complete");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
