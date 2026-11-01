# HeavenzFire Network — launch plan and evidence ledger

**Status:** Android-first local pilot foundation; not a production network or ISP.
**Target:** user-controlled command surface for enrolled devices and approved AI/task services.
**Initial delivery:** installable web app shell and loopback-only Gemini-backed UI with explicit security gates.

## Product definition

HeavenzFire Network is a software-defined, user-controlled network layer over existing internet connections. The first pilot coordinates a user's enrolled devices and approved AI/task services. Later phases may add community-operated nodes and connectivity partnerships; owning last-mile infrastructure is out of scope for the initial release.

## Release gates

1. **PWA shell:** manifest and service worker; production build verified in CI; Android installation still requires device evidence.
2. **Local gateway adapter:** versioned health/status API; bind locally by default; no unauthenticated remote control endpoints.
3. **Device enrollment:** per-device identity, short-lived challenge, explicit approval, revocation, audit events.
4. **Command center:** device online state, last-seen timestamp, gateway health, queued tasks, action confirmations.
5. **Pilot:** two owned devices plus one authorized host; reconnect/offline tests; threat model and privacy notice.
6. **Public beta:** independent security review, monitoring, incident response, terms/privacy, tested recovery.

## Acceptance criteria

- `npm run build`, `npm test`, and `npm run verify:bundle` pass in GitHub Actions.
- Manifest is valid JSON and includes name, start URL, display mode, and theme.
- Service worker caches same-origin app-shell responses only; it does not cache API responses or credentials.
- Gemini credentials remain server-side; the browser bundle scan rejects environment-key references and Google API-key-shaped values.
- The `/api/agent` endpoint is same-origin and loopback-only. Remote binding remains disabled until authenticated device enrollment exists.
- Real Android install, offline/reconnect run, and authenticated device-to-gateway request remain **not verified** until evidence is recorded.

## Current source inspection

- The app is a Vite + React PWA shell with a six-agent Gemini UI.
- The previous Vite configuration injected `GEMINI_API_KEY` into the client bundle. That boundary has been removed: the browser now posts conversation data to `/api/agent`; the Node server reads `GEMINI_API_KEY` from its process environment or gitignored `.env.local` and calls Gemini.
- The local server refuses non-loopback `HOST` values until device enrollment and remote authorization are implemented.
- Requests are schema-validated, limited to 64 KiB and 100 history messages, rate-limited in memory, and marked `no-store`.
- The app is still an AI council UI, not a verified network controller.
- No live Android device or remote enrollment test was available through this GitHub-only execution path.

## Security and reliability requirements

- TLS for any future remote access; authenticated and authorized API requests; per-device identity; persistent rate limits; safe origin/CORS policy; audit logs with secrets excluded.
- Do not expose local inference or administrative ports directly to the public internet.
- Device state must distinguish unknown, offline, online, authenticated, and authorized. Never infer connection from configuration alone.
- Prefer local-first execution; disclose data transfer and cost for remote AI calls.
- Require explicit confirmation for destructive, financial, credential, and network-changing actions.

## Evidence ledger

| Check | Status | Evidence |
|---|---|---|
| Repository/package inspected | Verified | PR branch source reviewed |
| Android installability files | Implemented | manifest, service worker, viewport metadata |
| Server-side Gemini boundary | Implemented | `/api/agent`, environment key server-side, loopback-only host |
| API contract tests | Passed | 5 Node tests in GitHub Actions |
| Production build | Passed | Vite production build in GitHub Actions |
| Client-bundle secret scan | Passed | `npm run verify:bundle` |
| PWA installation on Android | Not tested | requires device/browser test |
| Device enrollment and authenticated remote access | Planned | not implemented; remote binding intentionally blocked |
| Production deployment | Blocked | needs device verification, enrollment, threat model, independent review |

## Next engineering step

Implement authenticated device enrollment and a narrowly scoped health/status endpoint before enabling any non-loopback binding. Do not call the service production-ready until the remaining device, security, and recovery gates pass.
