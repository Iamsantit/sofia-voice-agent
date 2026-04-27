import crypto from "node:crypto";

/**
 * Tiny HS256 JWT helpers used by /api/auth routes so we can issue a
 * session cookie without round-tripping to Modal (saves the cold-start).
 *
 * The token format is a standard JWT (header.payload.signature) signed
 * with the same JWT_SECRET as the Python backend, so PyJWT can verify
 * it on the server side without changes.
 */

const ALG_HEADER = base64Url(
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })),
);

function base64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) {
    throw new Error("JWT_SECRET env var is not set");
  }
  return s;
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
