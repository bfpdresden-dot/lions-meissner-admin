import { storage } from "./storage";

export const KNOWN_ROUTE_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/admin(\/.*)?$/,
  /^\/veranstaltungen$/,
  /^\/datenschutz$/,
  /^\/subscribe\/member\/[^/]+$/,
  /^\/subscribe\/[^/]+$/,
  /^\/mein-bereich$/,
  /^\/passwort-reset$/,
  /^\/abmelden$/,
  /^\/schichtplan\/[^/]+$/,
  /^\/anleitung$/,
];

export function isKnownRoute(pathname: string): boolean {
  const clean = pathname.split("?")[0].split("#")[0];
  return KNOWN_ROUTE_PATTERNS.some((r) => r.test(clean));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface PageMeta {
  title: string;
  description: string;
  canonicalPath: string;
  preContent: string;
  ogImage?: string;
}

async function resolvePageMeta(pathname: string, query: Record<string, string> = {}): Promise<PageMeta> {
  const site = "Lions Club Meißner Land";

  if (pathname === "/" || pathname === "/veranstaltungen") {
    // Deep-link to a specific event: /?event=<id>
    const eventIdParam = query["event"] ? parseInt(query["event"], 10) : null;
    if (eventIdParam && !isNaN(eventIdParam)) {
      try {
        const ev = await storage.getEvent(eventIdParam);
        if (ev && ev.isActive) {
          const photos = await storage.getEventPhotos(eventIdParam);
          const firstPhoto = photos.length > 0 ? photos[0].filename : null;
          const date = ev.date ? new Date(ev.date).toLocaleDateString("de-DE") : "";
          return {
            title: `${ev.title} – ${site}`,
            description: `${ev.description ? ev.description.slice(0, 155) : `Veranstaltung des ${site}`}${date ? ` · ${date}` : ""}`,
            canonicalPath: `/?event=${eventIdParam}`,
            preContent: `<h1>${escapeHtml(ev.title)}</h1><p>${escapeHtml(ev.description || "")}</p>`,
            ogImage: firstPhoto
              ? (firstPhoto.startsWith("http://") || firstPhoto.startsWith("https://")
                  ? firstPhoto
                  : `__BASE__/uploads/${firstPhoto}`)
              : undefined,
          };
        }
      } catch {
        // fall through to default
      }
    }

    let eventItems = "";
    try {
      const evts = await storage.getEvents();
      const active = evts.filter((e) => e.isActive);
      if (active.length > 0) {
        eventItems = active
          .map((e) => {
            const date = e.date
              ? new Date(e.date).toLocaleDateString("de-DE")
              : "";
            const loc = e.location ? ` · ${escapeHtml(e.location)}` : "";
            return `<li><strong>${escapeHtml(e.title)}</strong>${date ? ` – ${date}` : ""}${loc}</li>`;
          })
          .join("");
      }
    } catch {
      // DB not available during build/prerender; omit list
    }
    return {
      title: `Veranstaltungen – ${site}`,
      description: `Aktuelle Veranstaltungen des ${site}. Informieren Sie sich und melden Sie sich online an.`,
      canonicalPath: "/",
      preContent: `<h1>Veranstaltungen</h1><p>${site}</p>${eventItems ? `<ul>${eventItems}</ul>` : ""}`,
    };
  }

  if (pathname === "/datenschutz") {
    return {
      title: `Datenschutzerklärung – ${site}`,
      description: `Datenschutzerklärung des ${site} gemäß DSGVO.`,
      canonicalPath: "/datenschutz",
      preContent: `<h1>Datenschutzerklärung</h1><p>${site} – Informationen zum Datenschutz gemäß DSGVO.</p>`,
    };
  }

  const memberMatch = pathname.match(/^\/subscribe\/member\/([^/]+)$/);
  if (memberMatch) {
    return {
      title: `Newsletter-Anmeldung – ${site}`,
      description: `Melden Sie sich für den Newsletter des ${site} an.`,
      canonicalPath: pathname,
      preContent: `<h1>Newsletter-Anmeldung</h1><p>Melden Sie sich für den Newsletter des ${site} an.</p>`,
    };
  }

  const eventMatch = pathname.match(/^\/subscribe\/(\d+)$/);
  if (eventMatch) {
    const eventId = parseInt(eventMatch[1], 10);
    try {
      const event = await storage.getEvent(eventId);
      if (event) {
        const date = event.date
          ? new Date(event.date).toLocaleDateString("de-DE")
          : "";
        const loc = event.location ? ` in ${escapeHtml(event.location)}` : "";
        const desc = event.description
          ? `<p>${escapeHtml(event.description)}</p>`
          : "";
        return {
          title: `Anmeldung: ${escapeHtml(event.title)} – ${site}`,
          description: `Melden Sie sich für „${event.title}"${date ? ` am ${date}` : ""}${event.location ? ` in ${event.location}` : ""} an.`,
          canonicalPath: pathname,
          preContent: `<h1>${escapeHtml(event.title)}</h1>${date ? `<p>Datum: ${date}${loc}</p>` : ""}${desc}`,
        };
      }
    } catch {
      // fall through to default
    }
    return {
      title: `Veranstaltungsanmeldung – ${site}`,
      description: `Anmeldung für eine Veranstaltung des ${site}.`,
      canonicalPath: pathname,
      preContent: `<h1>Veranstaltungsanmeldung</h1><p>${site}</p>`,
    };
  }

  const schichtplanMatch = pathname.match(/^\/schichtplan\/(\d+)$/);
  if (schichtplanMatch) {
    const eventId = parseInt(schichtplanMatch[1], 10);
    try {
      const event = await storage.getEvent(eventId);
      if (event) {
        const fmt = (d: Date) =>
          d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
        const startDate = new Date(event.date);
        const endDate = (event as any).endDate ? new Date((event as any).endDate) : null;
        const dateStr = endDate && fmt(endDate) !== fmt(startDate)
          ? `${fmt(startDate)} – ${fmt(endDate)}`
          : fmt(startDate);
        const loc = event.location ? escapeHtml(event.location) : "";
        const description = [dateStr, loc].filter(Boolean).join(" · ");
        return {
          title: `Schichtplan: ${escapeHtml(event.title)} – ${site}`,
          description,
          canonicalPath: pathname,
          preContent: `<h1>Schichtplan: ${escapeHtml(event.title)}</h1><p>${dateStr}${loc ? ` · ${loc}` : ""}</p>`,
        };
      }
    } catch (err) {
      console.error("[SSR] schichtplan error:", err);
    }
    return {
      title: `Schichtplan – ${site}`,
      description: `Schichtplan für eine Veranstaltung des ${site}.`,
      canonicalPath: pathname,
      preContent: "",
    };
  }

  if (pathname === "/mein-bereich") {
    return {
      title: `Mein Bereich – ${site}`,
      description: `Ihr persönlicher Bereich beim ${site} – Anmeldungen und Newsletter verwalten.`,
      canonicalPath: "/mein-bereich",
      preContent: "",
    };
  }

  return {
    title: `${site}`,
    description: `Lions Club Meißner Land – Veranstaltungen entdecken, anmelden und Newsletter abonnieren.`,
    canonicalPath: pathname,
    preContent: "",
  };
}

export async function injectPageMeta(
  html: string,
  pathname: string,
  baseUrl = "",
  query: Record<string, string> = {}
): Promise<string> {
  const meta = await resolvePageMeta(pathname, query);
  const canonicalUrl = `${baseUrl}${meta.canonicalPath}`;
  const rawOgImage = meta.ogImage
    ? meta.ogImage.replace("__BASE__", baseUrl)
    : `${baseUrl}/images/lions-logo.png`;
  const ogImageUrl = rawOgImage;

  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(meta.title)}</title>`
  );

  html = html.replace(
    /<meta name="description"[^>]*\/?>/,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`
  );

  html = html.replace(
    /<link rel="canonical"[^>]*\/?>/,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
  );

  html = html.replace(
    /<meta property="og:title"[^>]*\/?>/,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`
  );

  html = html.replace(
    /<meta property="og:description"[^>]*\/?>/,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`
  );

  html = html.replace(
    /<meta property="og:image"[^>]*\/?>/,
    `<meta property="og:image" content="${escapeHtml(ogImageUrl)}" />`
  );

  html = html.replace(
    /<meta property="og:url"[^>]*\/?>/,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
  );

  html = html.replace(
    /<meta name="twitter:title"[^>]*\/?>/,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`
  );

  html = html.replace(
    /<meta name="twitter:description"[^>]*\/?>/,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`
  );

  html = html.replace(
    /<meta name="twitter:image"[^>]*\/?>/,
    `<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />`
  );

  if (meta.preContent) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root"><div data-pre-render style="max-width:800px;margin:2rem auto;padding:1rem;font-family:sans-serif">${meta.preContent}</div></div>`
    );
  }

  return html;
}
