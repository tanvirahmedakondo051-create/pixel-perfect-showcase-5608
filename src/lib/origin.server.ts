import { getRequest } from "@tanstack/react-start/server";

/** Public origin of the current request (handles the sandbox preview proxy). */
export function appOrigin() {
  const r = getRequest();
  const u = new URL(r.url);
  const sandbox = u.hostname === "localhost" ? r.headers.get("x-forwarded-host") : null;
  return sandbox ? `https://${sandbox}` : u.origin;
}
