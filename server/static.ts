import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { isKnownRoute, injectPageMeta } from "./ssr";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("/{*path}", async (req, res) => {
    const pathname = req.path;

    if (!isKnownRoute(pathname)) {
      const indexPath = path.resolve(distPath, "index.html");
      let html = await fs.promises.readFile(indexPath, "utf-8");
      html = html.replace(
        /<title>[^<]*<\/title>/,
        "<title>Seite nicht gefunden – Lions Club Meißner Land</title>",
      );
      return res.status(404).set("Content-Type", "text/html").send(html);
    }

    const indexPath = path.resolve(distPath, "index.html");
    let html = await fs.promises.readFile(indexPath, "utf-8");
    html = await injectPageMeta(html, pathname);
    res.status(200).set("Content-Type", "text/html").send(html);
  });
}
