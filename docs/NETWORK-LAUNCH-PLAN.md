# HeavenzFire Network — launch plan and evidence ledger

**Status:** pilot foundation; not a production network or ISP.
**Target:** Android-first control surface for individuals and small businesses.
**Initial delivery:** installable web app shell and explicit security/verification gates.

## Product definition
HeavenzFire Network is a software-defined, user-controlled network layer over existing internet connections. The first pilot coordinates a user's enrolled devices and approved AI/task services. Later phases may add community-operated nodes and connectivity partnerships; owning last-mile infrastructure is out of scope for the initial release.

## Release gates
1. **PWA shell:** manifest and service worker; verify production build and installation on Android.
2. **Local gateway adapter:** narrow, versioned health/status API; bind locally by default; no unauthenticated control endpoints.
3. **Device enrollment:** per-device identity, short-lived challenge, explicit approval, revocation, audit events.
4. **Command center:** device online state, last-seen timestamp, gateway health, queued tasks, action confirmations.
5. **Pilot:** two owned devices plus one authorized host; reconnect/offline tests; threat model and privacy notice.
6. **Public beta:** independent security review, monitoring, incident response, terms/privacy, tested recovery.

## Acceptance criteria
- npm run build completes without errors.
- Manifest is valid JSON and includes name, start URL, display mode, and theme.
- Service worker caches same-origin app-shell responses only; it does not cache API responses or credentials.
- No new endpoint is exposed and no secret is added.
- Real Android install, offline/reconnect run, and authenticated device-to-gateway request remain **not verified** until evidence is recorded.

## Current source inspection
- package.json identifies a Vite + React app with dev, build, and preview scripts.
- Existing vite.config.ts defines process.env.API_KEY and process.env.GEMINI_API_KEY from environment values in client-side build configuration. Treat this as a **release blocker** until audited and removed or replaced with a server-side secret boundary. Do not deploy with a production API key in the browser bundle.
- Existing app is an AI council UI, not a verified network controller.
- No live local runtime or Android device test was available through this GitHub-only execution path.

## Security and reliability requirements
- TLS for remote access; authenticated and authorized API requests; per-device identity; rate limits; request-size limits; safe origin/CORS policy; audit logs with secrets excluded.
- Do not expose local inference or administrative ports directly to the public internet.
- Device state must distinguish unknown, offline, online, authenticated, and authorized. Never infer connection from configuration alone.
- Prefer local-first execution; disclose data transfer and cost for remote AI calls.
- Require explicit confirmation for destructive, financial, credential, and network-changing actions.

## Evidence ledger
| Check | Status | Evidence |
|---|---|---|
| Repository/package inspected | Verified | main branch package.json, vite.config.ts, index.html, App.tsx inspected |
| Android installability files added | Implemented | this branch |
| Build/test run here | Blocked | GitHub connector edits source but cannot execute npm scripts |
| PWA installation on Android | Not tested | requires device/browser test |
| Secure device enrollment | Planned | no authenticated enrollment implementation verified |
| Production deployment | Blocked | client-bundled API key risk must be resolved first |

## Next engineering step
Create a server-side gateway adapter with a health-only endpoint and contract tests, then bind the Android dashboard to it. Do not call the service production-ready until release gates pass.
