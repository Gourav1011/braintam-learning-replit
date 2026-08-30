const STUDENT_AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/sign-in",
  "/sign-up",
]);

export function getStudentAuthRedirect(
  search: string,
  fallback = "/dashboard",
): string {
  const requested = new URLSearchParams(search).get("redirect_url");

  if (!requested || !requested.startsWith("/") || requested.includes("\\")) {
    return fallback;
  }

  try {
    const appOrigin = "https://braintam.invalid";
    const parsed = new URL(requested, appOrigin);
    if (parsed.origin !== appOrigin || STUDENT_AUTH_PATHS.has(parsed.pathname)) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function legacyStudentAuthDestination(
  destination: "/login" | "/register",
  search: string,
): string {
  const redirectTo = getStudentAuthRedirect(search);
  return `${destination}?redirect_url=${encodeURIComponent(redirectTo)}`;
}