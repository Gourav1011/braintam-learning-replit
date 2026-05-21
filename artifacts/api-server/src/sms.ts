import pino from "pino";

const logger = pino({ name: "sms" });

const IS_PROD = process.env.NODE_ENV === "production";

// Warn at startup if no SMS provider is configured in production
if (IS_PROD) {
  const hasF2S = !!process.env.FAST2SMS_API_KEY;
  const hasTwilio =
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_PHONE_NUMBER;
  if (!hasF2S && !hasTwilio) {
    logger.warn(
      "No SMS provider configured (FAST2SMS_API_KEY or TWILIO_*). " +
      "OTP login will be unavailable in production."
    );
  }
}

async function sendViaFast2Sms(phone: string, otp: string): Promise<boolean> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) return false;

  const digits = phone.replace(/^\+91/, "").replace(/\D/g, "");

  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "otp",
      variables_values: otp,
      numbers: digits,
    }),
  });

  const json = (await res.json()) as { return: boolean; message?: string[] };
  if (json.return) {
    logger.info({ phone, provider: "fast2sms" }, "OTP sent via SMS");
    return true;
  }
  logger.warn({ phone, provider: "fast2sms", reason: json.message?.join(", ") }, "SMS delivery failed");
  return false;
}

async function sendViaTwilio(phone: string, otp: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return false;

  const to = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
  const body = `Your Braintam OTP is: ${otp}. Valid for 10 minutes. Do not share this with anyone.`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });

  const json = (await res.json()) as { sid?: string; code?: number; message?: string };
  if (res.ok && json.sid) {
    logger.info({ phone, provider: "twilio" }, "OTP sent via SMS");
    return true;
  }
  logger.warn({ phone, provider: "twilio", code: json.code, reason: json.message }, "SMS delivery failed");
  return false;
}

/**
 * Sends an OTP via SMS.
 * Returns true if the message was delivered by a real provider.
 * Returns false if no provider is configured (dev fallback only — callers
 * should treat false as a hard failure in production).
 */
export async function sendOtp(phone: string, otp: string): Promise<boolean> {
  if (await sendViaFast2Sms(phone, otp)) return true;
  if (await sendViaTwilio(phone, otp)) return true;

  // Dev fallback — never logs the OTP value, just signals it is unconfigured
  if (!IS_PROD) {
    logger.warn({ phone }, "SMS not configured — OTP stored in DB; retrieve via /auth/verify-otp for local testing");
  }
  return false;
}
