import pino from "pino";

const logger = pino({ name: "otp" });

/**
 * Logs the OTP to the server console for development/testing.
 * In production, integrate a real SMS provider here.
 */
export async function sendOtp(phone: string, otp: string): Promise<void> {
  logger.info({ phone, otp }, "OTP generated — check server logs to retrieve code");
}
