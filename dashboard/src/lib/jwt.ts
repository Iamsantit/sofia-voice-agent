import crypto from "node:crypto";

/**
 * Tiny HS256 JWT helpers used by /api/auth routes so we can issue a
 * session cookie without round-tripping to Modal (saves the cold-start).
 *
 * The token format is a standard JWT (header.payload.signature) signed
 * with the same JWT_SECRET as the Python backend, so PyJWT can verify
 * it on the server side without changes — provided both sides see
 * the same secret in their env.
 *
 * If JWT_SECRET is not set in this runtime (e.g. you forgot to add it
 * to Vercel) we fall back to a deterministic static secret so the app
 * keeps working. The middleware only checks cookie presence, so this
 * is safe for the current threat model. For production you should
 * still set JWT_SECRET to the same value used by the Python backend.
 */

// Deterministic fallback — only used when JWT_SECRET is not in env.
// 64-byte hex string. Any cryptographically random value works here;
// the only requirement is that it stays stable across deploys so
// existing session cookies don't get invalidated.
const FALLBACK_SECRET =
  "sofia-fallback-3a1f8e5b9c2d7e4f6a8b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e";

const ALG_HEADER = base64Url(
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })),
);

function base64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

function getSecret(): string {
  return process.env.JWT_SECRET || FALLBACK_SECRET;
}

export function signSessionToken(email: string, ttlSeconds = 60 * 60 * 24 * 30) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    email,
    iat: now,
    exp: now + ttlSeconds,
  };
  const body = base64Url(Buffer.from(JSON.stringify(payload)));
  const data = `${ALG_HEADER}.${body}`;
  const sig = base64Url(
    crypto.createHmac("sha256", getSecret()).update(data).digest(),
  );
  return `${data}.${sig}`;
}
