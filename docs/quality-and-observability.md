# Quality and observability

## Pull-request quality gate

GitHub Actions runs lint, TypeScript, all local unit/evaluation tests, Expo
dependency checks, Expo Doctor, a critical production dependency audit, and a
clean bundle for Android, iOS, and web. It runs on pull requests and pushes to
`main`, with older runs cancelled when a newer commit arrives.

## Android navigation E2E

The Maestro smoke flow signs in with an existing adult test account that has a
completed profile, then verifies Home, Chat, Games, Progress, and the return to
Home. It uses the isolated `com.tien.trak.e2e` application ID so it cannot
overwrite a tester or production installation.

Create `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_TEST_EMAIL`, and
`E2E_TEST_PASSWORD` as GitHub Actions secrets. The credentials must belong to an
existing adult test account with a completed profile on the test backend.
Trigger the workflow manually, or apply the `e2e` label to a pull request. It is
intentionally not run on every commit because producing a release APK and
starting an Android emulator is comparatively slow.

The job generates the native project with Expo Prebuild, builds a self-contained
release APK, starts an Android 14 emulator, and runs the open-source Maestro CLI.
EAS's pre-packaged Maestro job was not selected because it requires a paid Expo
plan; this workflow keeps the same real-device navigation coverage on GitHub's
runner.

## Crash reporting

Trak initializes Sentry only in a non-development build with
`EXPO_PUBLIC_SENTRY_DSN` configured and `EXPO_PUBLIC_SENTRY_ENABLED` not set to
`false`. The setup captures JavaScript and native
crashes but disables user identity, request payloads, screenshots, view
hierarchies, performance traces, profiling, and session replay. Console
and UI-interaction breadcrumbs are dropped; network breadcrumbs retain only the
method and host. Exception stacks and types remain useful for diagnosis, while
free-form exception messages are removed before upload.

Set these variables in the EAS `production` environment:

- `EXPO_PUBLIC_SENTRY_DSN`: the project DSN.
- `SENTRY_ORG`: the Sentry organization slug.
- `SENTRY_PROJECT`: the Sentry project slug.
- `SENTRY_AUTH_TOKEN`: a sensitive source-map upload token.

The last three are build-time configuration for symbolicated source maps. Never
commit the auth token. Non-production E2E builds set
`SENTRY_DISABLE_AUTO_UPLOAD=true` and do not send crashes without a DSN.

Before release, make an internal release build, produce one deliberate test
exception in a temporary local branch, confirm the issue and readable stack in
Sentry, then remove the test exception before distribution.
