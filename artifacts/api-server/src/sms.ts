import pino from "pino";

const logger = pino({ name: "sms" });

type SmsResult = { success: boolean; provider: string; error?: string };

async function sendViaFast2Sms(phone: string, otp: string): Promise<SmsResult> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) return { success: false, provider: "fast2sms", error: "not configured" };

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
  if (json.return) return { success: true, provider: "fast2sms" };
  return { success: false, provider: "fast2sms", error: json.message?.join(", ") };
}

async function sendViaTwilio(phone: string, otp: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return { success: false, provider: "twilio", error: "not configured" };

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

  const json = (await res.json()) as { sid?: string; status?: string; code?: number; message?: string };
  if (res.ok && json.sid) return { success: true, provider: "twilio" };
  return { success: false, provider: "twilio", error: `${json.code}: ${json.message}` };
}

export async function sendOtp(phone: string, otp: string): Promise<void> {
  const f2s = await sendViaFast2Sms(phone, otp);
  if (f2s.success) {
    logger.info({ phone, provider: "fast2sms" }, "OTP sent via SMS");
    return;
  }
  if (f2s.error !== "not configured") {
    logger.warn({ phone, error: f2s.error }, "Fast2SMS failed, trying Twilio");
  }

  const twilio = await sendViaTwilio(phone, otp);
  if (twilio.success) {
    logger.info({ phone, provider: "twilio" }, "OTP sent via SMS");
    return;
  }
  if (twilio.error !== "not configured") {
    logger.warn({ phone, error: twilio.error }, "Twilio failed");
  }

  logger.warn({ phone, otp }, "SMS not configured — OTP logged to console (dev mode)");
}
