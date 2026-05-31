---
name: shoo-auth
description: Use when evaluating, implementing, reviewing, or debugging Shoo auth (shoo.dev) Google sign-in in browser apps, including @shoojs/react, @shoojs/auth, hosted shoo.js, Convex custom JWT integration, PKCE callbacks, session checks, and server-side id_token verification. Do not use for unrelated auth systems.
compatibility: Portable Agent Skills-style draft. Review before enabling.
---

# Shoo Auth

Deterministic workflow for deciding when Shoo fits and for applying it safely. This draft is not enabled automatically.

Primary reference snapshot: [references/shoo-docs-summary.md](references/shoo-docs-summary.md). Refresh the live Shoo docs before high-stakes or production decisions.

## When to Use

Use this skill when the task mentions any of:

- Shoo, shoo.dev, `@shoojs/auth`, `@shoojs/react`, `window.Shoo`, `shoo.js`, or `pairwise_sub`.
- Adding minimal Google sign-in to a browser app without Google client registration.
- Choosing between Shoo React, vanilla JS, framework-agnostic, hosted-script, or Convex integration.
- Implementing or reviewing Shoo callback handling, PKCE flow, session/revocation checks, or server-side `id_token` verification.
- Debugging Shoo audience, callback, storage, Convex JWT, or missing-PII issues.

Do not use this skill as the primary workflow for unrelated auth providers or generic OAuth/OIDC work, except to explicitly decide that Shoo is not a fit.

## Do Not Use / Escalate

Do not recommend Shoo as the sole answer when requirements include:

- Non-Google identity providers, passwords, enterprise SSO/SAML/SCIM, or rich hosted user management.
- Server-only auth without a browser redirect flow.
- Production authorization based only on browser-local identity, localStorage, or decoded-but-unverified JWT claims.
- Security/compliance-critical auth where maturity, SLAs, audit evidence, or operational ownership must be established first.

When any of these apply, state the mismatch and either ask whether Shoo is still mandatory or recommend comparing established auth providers.

## Inputs and Assumptions

Before changing code, determine these from the user or the project:

- Frontend shape: React, Next.js, vanilla/static, Convex, or another browser client.
- App origin for each environment, e.g. `http://localhost:3000` and `https://app.example.com`.
- Callback path and whether that path is served by the app/router.
- Server/runtime that will verify Shoo `id_token`s.
- Whether PII (`email`, `name`, `picture`) is actually needed.
- Package manager and existing auth/session conventions.

If these are missing and the repository is available, inspect manifests/routes before asking. If app origin or production verification path is unknown, ask; do not guess for production auth.

## Fit Gate

Apply this gate before implementation:

1. **Identity provider**: if Google-only sign-in is not acceptable, Shoo is not a fit.
2. **Client model**: if the app cannot perform browser redirects and store callback state in browser storage, Shoo is likely not a fit.
3. **Identifier model**: if an opaque per-origin stable ID is acceptable, use `pairwise_sub`/`sub` as the user key; if a global Google subject is required, Shoo is not a fit.
4. **PII minimization**: default to no PII. Use `requestPii: true` only when the app genuinely needs `email`, `name`, or `picture` and the UI explains why.
5. **Production rule**: production access control requires server verification of every Shoo `id_token` before trusting identity.
6. **Maturity rule**: for business-critical auth, verify current docs/package status and explicitly surface adoption risk before recommending Shoo.

## Workflow

### 1. Choose the integration path

Use the first matching path:

| Project need | Use | Notes |
|---|---|---|
| React SPA or React client component | `@shoojs/react` + `useShooAuth()` | Primary path for React. SSR-safe hook initializes in browser. |
| Next.js App Router | `@shoojs/react` plus a client callback page | Add a page at the configured callback path so the redirect does not 404. |
| Convex + React | `@shoojs/react` + `createShooConvexAuth()` + Convex `customJwt` | Also configure issuer/JWKS/ES256 and preferably audience/application ID. |
| Static/vanilla/no bundler | Hosted script `https://shoo.dev/shoo.js` | Use `window.Shoo.startSignIn()`, `getIdentity()`, `clearIdentity()`. |
| Framework-agnostic browser client | `@shoojs/auth` | Use lower-level client methods for custom flows. |
| Server API | JWT verification only | Shoo sign-in is browser-oriented; the server should verify tokens, not initiate trust from localStorage. |

### 2. Add the client integration

- Use the repository's package manager (`bun`, `npm`, `pnpm`, or `yarn`); ask before dependency changes unless implementation was explicitly requested.
- Default Shoo base URL is `https://shoo.dev`.
- Default framework-agnostic callback path is `/auth/callback`; docs also show `/shoo/callback` for Convex/hosted examples. Keep the configured callback path consistent across client, routes, and server expectations.
- React: call `useShooAuth()` in a client-side component; render sign-in when `!identity.userId`; call `signIn()` or `signIn({ requestPii: true })`; call `clearIdentity()` for sign-out.
- Vanilla/hosted script: include `https://shoo.dev/shoo.js`; use `window.Shoo.startSignIn({ returnTo, requestPii })`; read `window.Shoo.getIdentity()`; clear with `window.Shoo.clearIdentity()`.
- Custom client: create `createShooAuth({ callbackPath, shooBaseUrl })`; use `startSignIn()`, `handleCallback()` or `finishSignIn()`, `getIdentity()`, `clearIdentity()`.
- Keep `returnTo` relative or same-origin unless the app has an explicit open-redirect defense.

### 3. Handle callback deterministically

- Ensure the callback path is served by the SPA/router/static host.
- For Next.js App Router, create a client callback page that calls `useShooAuth()` and renders a transient "Signing in…" state.
- Prefer the high-level callback handler (`useShooAuth` auto handling or `handleCallback`) unless the app needs custom redirect control.
- If using manual handling, remove callback params after exchange and consume return-to state once.

### 4. Verify tokens server-side before authorization

Never authorize from `identity.userId`, localStorage, or `decodeIdentityClaims()` alone. Server verification must check:

| Check | Required value |
|---|---|
| Issuer | `https://shoo.dev` |
| Audience | `origin:{new URL(appOrigin).origin}` |
| Signature | ES256 against `https://shoo.dev/.well-known/jwks.json` |
| Expiration | Not expired |
| Core claim | `pairwise_sub` exists and is a string |

TypeScript shape with `jose`:

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

Treat `email`, `email_verified`, `name`, and `picture` as optional display/profile claims. Do not require them unless PII was requested and consented.

### 5. Add session/revocation handling when persistent sessions matter

- `@shoojs/auth` exposes `checkSession()` and `startSessionMonitor()`.
- `@shoojs/react` has `autoSessionMonitor` enabled by default and uses a 60s default interval.
- On `login_required` with reason `revoked`, `expired`, or `invalid_token`, clear local identity and prompt sign-in.
- If `checkSession()` reports `unsupported`, degrade gracefully and rely on token expiration/server verification.

### 6. Convex path

For Convex, configure a custom JWT provider:

```ts
export default {
  providers: [
    {
      type: "customJwt",
      issuer: "https://shoo.dev",
      jwks: "https://shoo.dev/.well-known/jwks.json",
      algorithm: "ES256",
      // Prefer also setting applicationID: "origin:https://your-app-origin"
    },
  ],
};
```

Then create a module with `createShooConvexAuth({ callbackPath })`, pass its `useAuth` to `ConvexProviderWithAuth`, and use `identity.subject` from `ctx.auth.getUserIdentity()` as the stable user ID.

## Common Failure Map

| Symptom | Likely cause | Deterministic check |
|---|---|---|
| Server rejects token for audience | `APP_ORIGIN`, redirect URI origin, or Convex application ID mismatch | Compare exact `new URL(origin).origin` values; audience must be `origin:{origin}`. |
| Callback route 404 | Router/static host does not serve callback path | Add route/page at configured callback path. |
| No identity after redirect | Callback handler did not run, state/verifier lost, storage key mismatch, or code/state absent | Check callback URL, sessionStorage PKCE state, localStorage identity key, and handler execution. |
| PII claims missing | PII not requested or user did not consent | Use `requestPii: true` only when needed; treat claims as optional. |
| Convex unauthenticated | Provider config mismatch or token not passed by adapter | Check issuer, JWKS, ES256, `applicationID`, and `fetchAccessToken()`. |
| Works locally but fails in production | Origin/audience or callback path differs | Configure per-environment origin and callback path explicitly. |

## Verification

For implementation tasks, verify at the smallest meaningful level:

- Build/typecheck/lint/tests for the modified repository.
- Callback path exists and does not 404.
- A successful sign-in produces an identity whose `userId`/`pairwise_sub` is present and starts with the expected opaque `ps_` form.
- Server verification succeeds for a real Shoo token from the current app origin.
- Negative verification rejects a token with the wrong audience, a tampered signature, or an expired token when feasible in tests.
- Authorization decisions use server-verified payloads, not client-decoded claims.
- Optional PII is absent by default and appears only after explicit `requestPii: true`/consent.
- Convex: an authenticated query can read `ctx.auth.getUserIdentity()` and returns `identity.subject`.

Optional endpoint sanity checks:

```bash
curl -fsS https://shoo.dev/.well-known/openid-configuration
curl -fsS https://shoo.dev/.well-known/jwks.json
```

## Safety and Failure Modes

- Shoo sign-in contacts shoo.dev and Google and changes browser storage; disclose this for manual tests.
- Do not log, paste, persist, or commit raw `id_token`s or OAuth callback URLs containing codes/state.
- Do not store secrets or user tokens in skill memory, fixtures, or examples.
- Do not make production auth recommendations without server verification and a maturity/risk caveat.
- Do not present `decodeIdentityClaims()` as verification; it is display-only.
- Be careful with localStorage-based identity in XSS-sensitive apps; server verification does not remove the need for normal frontend security controls.
- Ask before enabling this draft skill or moving it into an auto-discovered skill root.

## Sources and Maintenance

- Live docs root: `https://docs.shoo.dev/docs`.
- API refs: `/docs/api-reference/shoo-react` and `/docs/api-reference/shoo-auth`.
- Verification docs: `/docs/server-verification`.
- Flow docs: `/docs/how-it-works`.
- Convex docs: `/docs/convex`.
- Discovery/JWKS: `https://shoo.dev/.well-known/openid-configuration` and `https://shoo.dev/.well-known/jwks.json`.

If the live docs conflict with this skill, prefer the live docs and update the skill.

## Pi Adapter

- In Pi, fetch the Shoo docs directly for current claims when the decision is production/security-sensitive.
- Before editing an unfamiliar app, use repository exploration first, then make the smallest route/config/client/server changes needed.
- This file is a disabled draft under a non-discovered draft directory; review and ask before enabling.
