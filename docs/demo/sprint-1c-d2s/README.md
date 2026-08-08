# Sprint 1C-D2S dependency security triage

## Scope

This isolated block hardens only `public-demo` dependencies. It does not change
Sprint 1C-D2 functionality, remote D1 data, the deployed Worker, `main`, a pull
request or a merge.

Source branch: `feature/sprint-1c-dashboard-map-reporting`

Source commit: `a27fde531f7aac50755f3e30fbd2d921731624e3`

## Reproducible checkpoint

Pre-security checkpoint:

`InfinityAtlas_Sprint1C_D2S_PreSecurity_a27fde5_20260730.zip`

SHA-256:

`a6ae9e4550bd3a0b407ee32b324ef022ee771741229bdb893e1e225888123dc0`

The checkpoint excludes `.env`, credentials, tokens, local databases,
`node_modules`, build outputs, caches, logs and confidential UNICEF material.
All 14 pre-existing Sprint 1C-D2 artifact hashes were rechecked after the
dependency update and remain unchanged.

An entry-by-entry comparison against the checkpoint also verified 228 of 228
source and documentation files unchanged after excluding the two intended
dependency manifests: `public-demo/package.json` and
`public-demo/pnpm-lock.yaml`.

## Reproduction

- Node: `v24.14.0`
- pnpm: `11.9.0`
- OS: Windows 11 Home, AMD64
- Clean install: `pnpm install --frozen-lockfile --force`
- Lockfile check after remediation: `pnpm install --frozen-lockfile`

The first clean install preserved both manifest hashes. Full raw results are in
`security-artifacts/`.

## Audit result

| Audit | Before | After |
| --- | ---: | ---: |
| Critical | 0 | 0 |
| High | 7 | 1 |
| Moderate | 5 | 1 |
| Low | 3 | 0 |
| Production critical/high/moderate/low | 0/0/0/0 | 0/0/0/0 |

The Internet-facing RSC code was upgraded to `19.2.8`. Cloudflare tooling was
upgraded as a supported pair to `@cloudflare/vite-plugin 1.48.0` and
`wrangler 4.115.0`, bringing `miniflare 4.20260722.1`, `undici 7.28.0`,
`ws 8.21.0` and `esbuild 0.28.1`.

## Classification

- A - Internet-reachable production bundle: one advisory before remediation,
  zero after remediation.
- B - Production dependency not reachable in the current architecture: zero.
- C - Build, development or test tooling: fourteen advisories before
  remediation, two residual advisories after remediation.
- D - Duplicate/transitive paths: collapsed into the 15 unique advisory rows in
  `dependency-security-matrix.csv`.
- E - Advisory with no fixed release at all: zero. The two residual findings
  have upstream fixed majors, but no compatible fix through their current
  parent chains.

### Residual GHSA-mh99-v99m-4gvg

`brace-expansion 1.1.16` is used through `minimatch 3.1.5` by ESLint and its
plugins. It is not bundled. Only trusted repository globs are linted locally and
in CI. Current React and JSX ESLint plugins do not declare ESLint 10 support, so
an ESLint major update or a forced `brace-expansion 5` override would create an
unsupported dependency combination.

Mitigation: keep lint bound to trusted source and CI, never expose it as a
service, and reassess when the complete plugin chain declares ESLint 10 support.

### Residual GHSA-67mh-4wv8-2f99

`esbuild 0.18.20` is retained only under the obsolete
`@esbuild-kit/esm-loader` path in `drizzle-kit`. It is not bundled and is used
only for local migration tooling on trusted files. Drizzle Kit already uses
patched esbuild for its primary path, but its legacy loader has no compatible
parent update.

Mitigation: do not expose Drizzle Kit or its development server publicly and
replace the legacy loader when Drizzle publishes a compatible chain.

## Validation

- Frozen-lockfile installation: passed.
- `pnpm audit --prod`: zero vulnerabilities.
- Full audit: one high development-only finding and one moderate
  development-only finding, both documented above.
- Lint: passed.
- Public build and tests: 9 of 9 passed.
- Cloudflare dry run: passed; no deployment performed.
- Worker bindings: `env.DB` and `env.ASSETS` only.
- Public GET endpoints: passed.
- Invalid filter: HTTP 422.
- POST on the public page, health, dashboard, climate, report and CSV routes:
  HTTP 405.
- Local D1: 6 controlled observations, IDs 101-106, and 1 climate snapshot.
- Filters and map: repeated apply/clear passed; one result centers and opens its
  safe marker; full selection restores five visible locations.
- Mobile 390 px: the approved D2 visual reference remains byte-identical
  (`0532ce16eea5b21c98f070229f35fe52e9aa2241a42eecf216a0f1444b8cb8a2`);
  the source-preservation comparison confirms that no CSS or component file
  changed during D2S, and the automated responsive assertions pass.
- Chart tooltips: keyboard focus and Escape dismissal passed for bar, donut and
  timeline charts.
- Climate: provider observation and InfinityAtlas retrieval times remain
  separate; an unchanged provider interval is reported explicitly.
- PDF: English and Spanish, one-record and six-record variants rendered to four
  pages each and passed visual review.
- Technical CSV: comma-delimited, 15 stable machine columns, UTF-8, 6 records,
  ISO 8601 dates.
- Excel CSV: semicolon-delimited, UTF-8 BOM, 13 human-readable columns, 6
  records, ISO 8601 dates.
- Restricted fields: no passwords, tokens, sessions, actors, comments,
  evidence or audit fields in downloads.
- Remote D1: no command using `--remote` and no write was performed.
- Deployment: no `wrangler deploy` command was run.

## Recommendation

**APTO PARA COMMIT Y REDEPLOY**

This recommendation is limited to dependency security and the already approved
Sprint 1C-D2 behavior. The two residual findings are not in the deployed Worker
or assets, are not Internet reachable, and have explicit operational
mitigations. Commit, push and redeploy remain blocked until Carlos and Nova
approve this report.
