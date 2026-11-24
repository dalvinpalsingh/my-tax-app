import { createRemoteJWKSet, jwtVerify } from "jose";
import { handleApi } from "./api";

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

async function isAuthorized(request: Request, env: Env) {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  const {
    ACCESS_ISSUER: issuer,
    ACCESS_AUDIENCE: audience,
    ACCESS_EMAIL: email,
  } = env;
  if (!token || !issuer || !audience || !email) return false;

  try {
    let keys = keySets.get(issuer);
    if (!keys) {
      keys = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", issuer));
      keySets.set(issuer, keys);
    }
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "sub"],
    });
    return (
      payload.type === "app" &&
      typeof payload.email === "string" &&
      payload.email.toLowerCase() === email.trim().toLowerCase()
    );
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return handleApi(request, env.DB, await isAuthorized(request, env));
  },
} satisfies ExportedHandler<Env>;
