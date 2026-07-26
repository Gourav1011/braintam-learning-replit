import jwt from "jsonwebtoken";

const TOKEN_EXPIRY = "7d";

function getSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_TOKEN_SECRET must be set and at least 32 characters long");
  }

  return secret;
}

export function generateAuthToken(userId: number): string {
  return jwt.sign(
    { userId },
    getSecret(),
    {
      algorithm: "HS256",
      expiresIn: TOKEN_EXPIRY,
    }
  );
}

export function verifyAuthToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, getSecret(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload === "string" ||
      typeof payload.userId !== "number" ||
      !Number.isInteger(payload.userId) ||
      payload.userId <= 0
    ) {
      return null;
    }

    return payload.userId;
  } catch {
    return null;
  }
}

const PASSWORD_SETUP_EXPIRY = "15m";

export function generatePasswordSetupToken(
  userId: number,
  paymentId: number
): string {
  return jwt.sign(
    {
      userId,
      paymentId,
      purpose: "password_setup",
    },
    getSecret(),
    {
      algorithm: "HS256",
      expiresIn: PASSWORD_SETUP_EXPIRY,
    }
  );
}

export function verifyPasswordSetupToken(token: string): {
  userId: number;
  paymentId: number;
} | null {
  try {
    const payload = jwt.verify(token, getSecret(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload === "string" ||
      payload.purpose !== "password_setup" ||
      typeof payload.userId !== "number" ||
      !Number.isInteger(payload.userId) ||
      payload.userId <= 0 ||
      typeof payload.paymentId !== "number" ||
      !Number.isInteger(payload.paymentId) ||
      payload.paymentId <= 0
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      paymentId: payload.paymentId,
    };
  } catch {
    return null;
  }
}
