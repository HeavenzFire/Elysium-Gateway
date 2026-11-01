# Elysium Gateway — HeavenzFire Network pilot

This repository is an Android-first PWA shell and local Gemini-backed agent UI. It is not a production network controller, ISP, or authenticated multi-device control plane.

## Local run

1. Install Node.js 20+ and dependencies: `npm install`.
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`, or provide that variable to the server process. Do not put it in a `VITE_*` variable, client-side code, or a committed file.
3. Start the combined local Vite + API server: `npm run dev`.
4. Open `http://127.0.0.1:3000`.

The server reads the key from its process environment or local server-side `.env.local` via Vite's server-side environment loader. The file is gitignored and the value is never injected into the browser bundle.

The server binds to loopback only. Remote binding is deliberately rejected until authenticated device enrollment and an authorization boundary exist. For an Android-local pilot, run the server and open the app on the same device. Do not expose port 3000 to the LAN or internet.

## Production preview

```sh
npm run build
npm run verify:bundle
npm run preview
```

The preview server serves `dist/` and the same server-side `/api/agent` route. Set `GEMINI_API_KEY` in the server environment or server-side `.env.local` before starting it. Without a key, the PWA shell remains available but the API returns 503.

## Security boundary

- The browser sends conversation text to same-origin `POST /api/agent`; it never receives the Gemini API key.
- The Node server reads `GEMINI_API_KEY` from its process environment or gitignored local env file and calls Gemini server-side.
- Requests are schema-validated, capped at 64 KiB / 100 history messages, rate-limited in memory, and marked `no-store`.
- The server refuses non-loopback `HOST` values. Authenticated device enrollment, persistent rate limits, TLS termination, and remote access are not implemented.
- Never commit `.env` or credential files. `.env.example` contains no secret.

## Checks

`npm test` runs API contract tests. `npm run build` creates the PWA assets. `npm run verify:bundle` scans the generated browser bundle for API-key references. Android installation, offline/reconnect behavior, and authenticated device enrollment still require device-side verification.
