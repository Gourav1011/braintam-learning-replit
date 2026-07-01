import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import fs from "node:fs";
import path from "node:path";

declare const __BRAINTAM_VERSION__: string;
declare const __BRAINTAM_COMMIT__: string;
declare const __BRAINTAM_BUILD_TIME__: string;

const router: IRouter = Router();

function getBuildConst(name: "version" | "commit" | "buildTime"): string {
  const map: Record<string, string> = {
    version: typeof __BRAINTAM_VERSION__ !== "undefined" ? __BRAINTAM_VERSION__ : "dev",
    commit: typeof __BRAINTAM_COMMIT__ !== "undefined" ? __BRAINTAM_COMMIT__ : "unknown",
    buildTime: typeof __BRAINTAM_BUILD_TIME__ !== "undefined" ? __BRAINTAM_BUILD_TIME__ : new Date().toISOString(),
  };
  return map[name];
}

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/version", (_req, res) => {
  res.json({
    version: getBuildConst("version"),
    commit: getBuildConst("commit"),
    buildTime: getBuildConst("buildTime"),
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

router.get("/health", async (_req, res) => {
  // Frontend: check the React SPA dist dir exists on disk
  const staticIndexPath = path.resolve(
    globalThis.__dirname ?? "",
    "../../braintam/dist/public/index.html",
  );
  const frontendOk = fs.existsSync(staticIndexPath);

  // Database: quick connectivity ping
  let databaseOk = false;
  try {
    await pool.query("SELECT 1");
    databaseOk = true;
  } catch {
    databaseOk = false;
  }

  // Socket.IO: always true when this handler is reachable —
  // Socket.IO is co-initialized with the HTTP server in index.ts.
  const socketOk = true;

  const version = getBuildConst("version");
  const commit = getBuildConst("commit");
  const buildTime = getBuildConst("buildTime");

  const status = databaseOk ? "ok" : "degraded";

  res.status(databaseOk ? 200 : 503).json({
    status,
    frontend: frontendOk,
    socket: socketOk,
    database: databaseOk,
    version,
    commit,
    buildTime,
  });
});

export default router;
