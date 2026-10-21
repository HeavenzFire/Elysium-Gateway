# Unified Field Gateway: Degraded Mode and Recovery

Status: operational requirements for review; not a claim that production failover has been tested.

## Failure behavior
- Missing provider credentials: return a generic unavailable response; never expose environment values.
- Provider quota or rate limit: report a bounded unavailable/degraded result and preserve the user's local work.
- Timeout or upstream error: do not mark a request successful; avoid logging prompts or secrets.
- Local server unavailable: callers must surface the failure clearly and keep unsent proposals available for retry.

## Recovery requirements
- Use bounded timeouts and bounded retries with backoff.
- Do not silently send requests to a different provider.
- Keep API credentials server-side and out of Vite/browser bundles.
- Verify the configured listener remains loopback-only unless a separately reviewed authenticated deployment mode is introduced.
- Test failure paths with mocked provider responses before any live provider test.

## Acceptance checklist
- [ ] Missing key test
- [ ] Quota/rate-limit simulation
- [ ] Timeout and retry-bound test
- [ ] No-secret-in-response/log test
- [ ] Pending work survives gateway restart
- [ ] CI passes and PR security review is complete
