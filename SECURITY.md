# Security policy — NASIB +62

## Supported release

Security fixes target the current default branch. Please avoid posting exploitable details, room codes, or any credentials in public issues.

To report a vulnerability, use GitHub's private **Report a vulnerability** / Security Advisories option for this repository when available. Include affected page/build, browser, reproduction steps, impact, and whether the issue requires being a room participant.

## Key handling

- `VITE_SUPABASE_URL` and a Supabase publishable key (or legacy `anon` key) are browser-visible configuration, not secrets.
- Never place a Supabase `secret` or `service_role` key in Vite variables, source files, GitHub Variables, or browser storage.
- If an elevated key ever entered Git history, rotate it in Supabase; deleting the current file does not erase history.
- Do not add user-entered HTML with `dangerouslySetInnerHTML`. Existing legacy fragments are checked-in static markup; player names, chat, and broadcast content must remain text and be validated before affecting engine state.

## Multiplayer threat model

The current quick-play lobby uses public Supabase Realtime Broadcast + Presence so friends can join without accounts or custom database tables. A random room code is an invitation, not authentication. Payload validation, slot normalization and client-side host-ID checks reduce malformed packets and accidental spoofing, but **are not an authorization boundary**: a malicious participant or someone who obtains the room code can forge broadcasts, impersonate a slot or disrupt a casual match.

Do not use the current multiplayer protocol for ranked play, cash prizes, or trusted leaderboards. A competitive release needs a server-authoritative game engine, authenticated/private Realtime channels, RLS policies tied to server-created room membership, and per-user/room rate limits. See [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization).

## Launch gates

Run locally or in CI:

```sh
npm run check
npm run build
npm run test:e2e
npm audit --audit-level=high
```

The GitHub Actions workflow runs the dependency audit, engine patch validation, unit tests, production build, and browser tests. Treat any high/critical audit finding, failed workflow, failed Vercel production build, or untested browser-specific issue as a release blocker. A green build alone is not a substitute for checking the deployed site on iOS Safari and Android Chrome.
