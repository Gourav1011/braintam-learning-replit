import { logger } from "../lib/logger.js";

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

export interface SmsResult {
  ok: boolean;
  error?: string;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  return digits;
}

export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  if (!FAST2SMS_API_KEY) {
    logger.warn("FAST2SMS_API_KEY not set — skipping SMS");
    return { ok: false, error: "FAST2SMS_API_KEY not configured" };
  }

  const number = normalizePhone(phone);
  if (number.length !== 10) {
    logger.warn({ number }, "Invalid phone number for SMS — skipping");
    return { ok: false, error: `Invalid phone number: ${phone}` };
  }

  try {
    const body = new URLSearchParams({
      route: "q",
      message,
      language: "english",
      flash: "0",
      numbers: number,
    });

    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: FAST2SMS_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: body.toString(),
    });

    const json = (await res.json()) as { return: boolean; message?: string[] };
    if (!json.return) {
      const errMsg = json.message?.join(", ") ?? "Unknown Fast2SMS error";
      logger.warn({ number, errMsg }, "Fast2SMS returned failure");
      return { ok: false, error: errMsg };
    }

    logger.info({ number }, "SMS sent via Fast2SMS");
    return { ok: true };
  } catch (err) {
    logger.error({ err, number }, "Failed to send SMS via Fast2SMS");
    return { ok: false, error: String(err) };
  }
}
