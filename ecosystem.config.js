// =============================================================================
// Braintam PM2 Ecosystem Config
// =============================================================================
// Usage:
//   pm2 start ecosystem.config.js       # first start
//   pm2 restart braintam-api            # subsequent restarts
//   pm2 save                            # persist across reboots
//   pm2 startup                         # auto-start on system boot
// =============================================================================

module.exports = {
  apps: [
    {
      name: "braintam-api",
      script: "node",
      args: "--enable-source-maps artifacts/api-server/dist/index.mjs",

      // Run from the repo root so relative paths resolve correctly
      cwd: "/root/braintam-learning-replit",

      // Single instance — Socket.IO requires sticky sessions for cluster mode
      instances: 1,
      exec_mode: "fork",

      // Restart policy
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      restart_delay: 3000,

      // Environment — production
      env: {
        NODE_ENV: "production",
        PORT: "5000",

        // ── Required secrets — fill these in ──────────────────────────────
        // Do NOT commit real values here. Set them via:
        //   pm2 set braintam-api:NEON_DATABASE_URL "postgres://..."
        // or export them in your shell before running pm2 start.
        //
        // NEON_DATABASE_URL:   "postgresql://user:pass@host/db?sslmode=require"
        // SESSION_SECRET:      "a-long-random-string"
        // CLERK_SECRET_KEY:    "sk_live_..."
        // CLERK_PUBLISHABLE_KEY: "pk_live_..."
        // RAZORPAY_KEY_ID:     "rzp_live_..."
        // RAZORPAY_KEY_SECRET: "..."
        // FAST2SMS_API_KEY:    "..."
      },

      // Log files
      out_file: "/root/.pm2/logs/braintam-api-out.log",
      error_file: "/root/.pm2/logs/braintam-api-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};
