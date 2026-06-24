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

app.use("/api", router);

// ── Serve frontend static files ──────────────────────────────
// Resolves to artifacts/braintam/dist/public relative to the compiled server
const staticDir = process.env["STATIC_DIR"] ??
  path.resolve(__dirname, "../../braintam/dist/public");

if (fs.existsSync(staticDir)) {
  logger.info({ staticDir }, "Serving frontend static files");

  // Hashed assets (JS/CSS/images) — cache aggressively
  app.use(express.static(staticDir, { maxAge: "1y", index: false }));

  // All non-API routes → serve index.html (SPA client-side routing)
  // index.html must NOT be cached so browsers always fetch the latest version
  app.get("/*", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.sendFile(path.join(staticDir, "index.html"));
  });
} else {
  logger.warn({ staticDir }, "Frontend static dir not found — skipping static serving");
}

export default app;
