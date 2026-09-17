import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "node:path";
import fs from "node:fs";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({
  limit: "50kb",
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// Prevent browsers and proxies from caching any API response
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// ── Temporary request logging — remove after VPS diagnostics ─
app.use((req, _res, next) => {
  console.log("[REQ]", req.method, req.originalUrl);
  next();
});

app.use("/api", router);

// ── API 404 guard — must come before SPA catch-all ────────────
// Ensures unmatched /api/* routes return JSON 404, never index.html
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// ── Serve frontend static files ──────────────────────────────
// Resolves to artifacts/braintam/dist/public relative to the compiled server
const staticDir = process.env["STATIC_DIR"] ??
  path.resolve(__dirname, "../../braintam/dist/public");

if (fs.existsSync(staticDir)) {
  logger.info({ staticDir }, "Serving frontend static files");

  // Hashed assets (JS/CSS/images) — cache aggressively
  app.use(express.static(staticDir, { maxAge: "1y", index: false }));

  // ── SEO-aware SPA catch-all ─────────────────────────────────
  // Public pages get their own canonical URL.
  // Private/system pages are kept out of search engines.
  const indexablePublicPaths = new Set([
    "/",
    "/terms",
    "/privacy",
    "/our-story",
    "/meet-the-masters",
    "/join-the-mission",
    "/knowledge-hub",
    "/newsroom",
    "/global-alliances",
    "/connect",
    "/help",
    "/student-protection",
    "/enroll",
    "/enroll-full",
    "/download-app",
    "/live-classes",
    "/courses",
  ]);

  const noIndexPaths = new Set([
    "/refund",
    "/login",
    "/forgot-password",
    "/register",
    "/onboarding",
    "/dashboard",
    "/tasks",
    "/rewards",
    "/homework",
    "/assignments",
    "/tests",
    "/profile",
    "/demo-batches",
    "/sign-in",
    "/sign-up",
    "/teacher/login",
    "/admin/login",
    "/mentor/login",
    "/admin",
    "/teacher",
    "/mentor",
    "/recordings",
    "/animated-videos",
    "/leaderboard",
    "/space-journey",
  ]);

  app.use((req, res) => {
    const pathname = req.path.replace(/\/+$/, "") || "/";
    const canonicalUrl = `https://braintam.com${pathname}`;

    const shouldIndex = indexablePublicPaths.has(pathname);
    const shouldNoIndex =
      noIndexPaths.has(pathname) ||
      pathname.startsWith("/admin/") ||
      pathname.startsWith("/teacher/") ||
      pathname.startsWith("/mentor/") ||
      pathname.startsWith("/dashboard/") ||
      pathname.startsWith("/live/") ||
      pathname.startsWith("/courses/") ||
      pathname.startsWith("/tests/") ||
      pathname.startsWith("/demo-batches/");

    let html = fs.readFileSync(path.join(staticDir, "index.html"), "utf8");

    html = html.replace(
      /<link\s+rel=["']canonical["'][^>]*>\s*/i,
      ""
    );

    html = html.replace(
      /<meta\s+name=["']robots["'][^>]*>\s*/i,
      ""
    );

    html = html.replace(
      /<\/head>/i,
      `    <link rel="canonical" href="${canonicalUrl}" />\n</head>`
    );

    const robotsContent =
      shouldIndex && !shouldNoIndex
        ? "index, follow"
        : "noindex, follow";

    html = html.replace(
      /<\/head>/i,
      `    <meta name="robots" content="${robotsContent}" />\n</head>`
    );

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });
} else {
  logger.warn({ staticDir }, "Frontend static dir not found — skipping static serving");
}

export default app;
