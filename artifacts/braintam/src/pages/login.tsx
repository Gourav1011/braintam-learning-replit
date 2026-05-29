import { Redirect } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function LoginPage() {
  return <Redirect to={`${BASE}/sign-in`} />;
}
