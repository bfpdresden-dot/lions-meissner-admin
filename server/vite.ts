import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { isKnownRoute, injectPageMeta } from "./ssr";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Block unknown routes BEFORE Vite middleware so they never pass through
  app.use((req, res, next) => {
    const pathname = req.originalUrl.split("?")[0];
    // Let API, assets (/src/, /@, /node_modules/), HMR, and known SPA routes through
    if (
      pathname.startsWith("/api/") ||
      pathname.startsWith("/src/") ||
      pathname.startsWith("/@") ||
      pathname.startsWith("/node_modules/") ||
      pathname === "/vite-hmr" ||
      isKnownRoute(pathname)
    ) {
      return next();
    }
    // Let known server-generated files through to their Express routes
    if (pathname === "/sitemap.xml" || pathname === "/robots.txt" || pathname === "/llms.txt") {
      return next();
    }
    // For other static file extensions (js, css, png, svg, etc.) let Vite serve them
    if (/\.\w+$/.test(pathname)) {
      return next();
    }
    // Unknown SPA path → serve index.html with 404 status
    const clientTemplate = path.resolve(
      import.meta.dirname,
      "..",
      "client",
      "index.html",
    );
    fs.promises
      .readFile(clientTemplate, "utf-8")
      .then((template) => {
        const page = template
          .replace(
            `src="/src/main.tsx"`,
            `src="/src/main.tsx?v=${nanoid()}"`,
          )
          .replace(
            /<title>[^<]*<\/title>/,
            "<title>Seite nicht gefunden – Lions Club Meißner Land</title>",
          );
        res.status(404).set({ "Content-Type": "text/html" }).end(page);
      })
      .catch(() => {
        res.status(404).send("Not Found");
      });
  });

  app.use(vite.middlewares);

  app.use("/{*path}", async (req, res, next) => {
    const pathname = req.originalUrl.split("?")[0];

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      let page = await vite.transformIndexHtml(pathname, template);
      page = await injectPageMeta(page, pathname);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
