import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

declare const __BRAINTAM_VERSION__: string;
declare const __BRAINTAM_COMMIT__: string;
declare const __BRAINTAM_BUILD_TIME__: string;

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/version", (_req, res) => {
  res.json({
    version: typeof __BRAINTAM_VERSION__ !== "undefined" ? __BRAINTAM_VERSION__ : "dev",
    commit: typeof __BRAINTAM_COMMIT__ !== "undefined" ? __BRAINTAM_COMMIT__ : "unknown",
    buildTime: typeof __BRAINTAM_BUILD_TIME__ !== "undefined" ? __BRAINTAM_BUILD_TIME__ : new Date().toISOString(),
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

export default router;
