# EagleView v4.6.3

Micro-fix release for ticker-detail information quality and dashboard timestamp clarity.

## Changes

- Ticker detail About section now rejects generic Yahoo profile prompt text such as “See the company profile…” so the modal falls through to a real business summary or conservative EagleView fallback.
- Bumped ticker-info server/client cache schema keys so stale generic descriptions are not reused after deployment.
- Dashboard top summary now shows the sector sync time immediately beside the date, using the same time formatting as the sector-card last-sync display, without adding “Last updated” wording.
- Version labels updated from v4.6.2 to v4.6.3.

## Verification

- `npm run build` compiled successfully and completed type/lint checks, then stopped at static prerender because this local environment has no Supabase URL configured.
- Targeted logic check confirms generic Yahoo profile prompt is rejected while a real company summary remains allowed.
