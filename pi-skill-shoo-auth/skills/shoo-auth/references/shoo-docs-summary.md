# Shoo Docs Summary

Snapshot date: 2026-05-31. Source: `https://docs.shoo.dev/docs` and linked Shoo docs pages. Refresh live docs before production/security-critical decisions.

## Core concept

Shoo is documented as a minimal Google sign-in auth broker. It handles Google OAuth with PKCE and returns:

- `pairwise_sub`: stable, domain-scoped user identifier.
- `id_token`: ES256-signed JWT for server verification.

Shoo derives the client ID from the callback origin:

```text
client_id = "origin:" + new URL(redirect_uri).origin
```

This means no Google/OAuth client registration step for the app in the normal Shoo flow.

## Client options

### React: `@shoojs/react`

Install:

```bash
bun add @shoojs/react
```

Main hook:

```ts
import { useShooAuth } from "@shoojs/react";
```

`useShooAuth()` returns `identity`, `claims`, `sessionState`, `loading`, `error`, `signIn`, `handleCallback`, `checkSession`, `refreshIdentity`, `clearIdentity`, and `authClient`.

Important options:

- `autoHandleCallback`: default `true`.
- `autoSessionMonitor`: default `true`.
- `sessionMonitorIntervalMs`: default `60000`.

### Vanilla/browser client: `@shoojs/auth`

Install:

```bash
bun add @shoojs/auth
```

Main entry point:

```ts
import { createShooAuth } from "@shoojs/auth";

const auth = createShooAuth({ shooBaseUrl: "https://shoo.dev" });
```

Useful client methods:

- `startSignIn({ requestPii?, returnTo? })`
- `handleCallback()`
- `finishSignIn()`
- `getIdentity()`
- `clearIdentity()`
- `decodeIdentityClaims()` — unverified; display only
- `exchangeCode()`
- `checkSession()`
- `startSessionMonitor()`
- `createPkceBundle()`
- `createSignInUrl()`
- `parseCallback()`
- `clearCallbackParams()`

Default options include:

- `shooBaseUrl`: `https://shoo.dev`
- `callbackPath`: `/auth/callback`
- `storageKey`: `shoo_identity`
- `pkceStorageKey`: `shoo_pkce`
- `returnToStorageKey`: `shoo_return_to`
- `fallbackPath`: `/`

### Hosted script

No-bundler path:

```html
<script src="https://shoo.dev/shoo.js"></script>
```

Typical globals:

- `window.Shoo.startSignIn({ returnTo?, requestPii? })`
- `window.Shoo.getIdentity()`
- `window.Shoo.clearIdentity()`

## Flow facts

- Shoo uses Authorization Code + PKCE.
- PKCE challenge method is S256; no plain challenge mode is documented.
- The verifier is kept in browser `sessionStorage` during the flow.
- Shoo redirects through Google, derives a pairwise subject, signs an `id_token`, then the client exchanges the Shoo code at `/token`.
- Stored identity is kept in browser `localStorage` by default.

## Token claims

Always present according to docs:

- `iss`
- `aud`
- `sub`
- `pairwise_sub`
- `iat`
- `exp`
- `jti`

Optional with PII request/consent:

- `email`
- `email_verified`
- `name`
- `picture`

## Server verification

Production servers must verify the Shoo `id_token` before authorization. Required checks:

| Check | Value |
|---|---|
| Issuer | `https://shoo.dev` |
| Audience | `origin:{your_app_origin}` |
| Signature | ES256 using Shoo JWKS |
| Expiration | Future `exp` |
| Core identity | `pairwise_sub` exists and is a string |

Endpoints:

- JWKS: `https://shoo.dev/.well-known/jwks.json`
- OIDC discovery: `https://shoo.dev/.well-known/openid-configuration`

`jose` sketch:

```ts
import { createRemoteJWKSet, jwtVerify } from "jose";

const jwks = createRemoteJWKSet(
  new URL("/.well-known/jwks.json", "https://shoo.dev"),
);

export async function verifyShooToken(idToken: string, appOrigin: string) {
  const audience = `origin:${new URL(appOrigin).origin}`;
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: "https://shoo.dev",
    audience,
  });
  if (typeof payload.pairwise_sub !== "string") {
    throw new Error("Shoo token missing pairwise_sub");
  }
  return payload;
}
```

## Convex

Convex provider config:

```ts
export default {
  providers: [
    {
      type: "customJwt",
      issuer: "https://shoo.dev",
      jwks: "https://shoo.dev/.well-known/jwks.json",
      algorithm: "ES256",
      // Optional/recommended audience check:
      // applicationID: "origin:https://your-app-origin",
    },
  ],
};
```

React adapter:

```ts
import { createShooConvexAuth } from "@shoojs/react";

export const { useAuth, signIn, signOut } = createShooConvexAuth({
  callbackPath: "/shoo/callback",
});
```

In Convex functions, use `ctx.auth.getUserIdentity()` and `identity.subject` as the stable user ID.

## Session/revocation

Shoo exposes `POST /session/check` and client wrappers:

- `checkSession()`
- `startSessionMonitor()`

Statuses:

- `{ status: "active" }`
- `{ status: "login_required", reason: "revoked" | "expired" | "invalid_token" }`
- `{ status: "unsupported" }` for older Shoo servers

On `login_required`, clear local identity and prompt sign-in.
