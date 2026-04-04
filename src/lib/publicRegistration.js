/** Self-service registration is disabled unless explicitly enabled (server env). */
export function isPublicRegistrationAllowed() {
  return process.env.ALLOW_PUBLIC_REGISTRATION === "true";
}
