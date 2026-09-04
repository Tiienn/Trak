# Dependency security review

Last reviewed: 2026-09-04

Trak stays on Expo SDK 57's supported dependency set. Run `npx expo install --check`,
`npx expo-doctor`, and `npm audit --omit=dev` when changing dependencies.

## Resolved in this review

- Aligned all Expo packages and React Native with the versions selected by
  `expo@57.0.19`.
- Updated compatible transitive fixes for `brace-expansion`, `browserslist`,
  `@xmldom/xmldom`, and `js-yaml`.
- Backported the upstream single-pass decoder from `decode-uri-component@0.5.0`
  into the CommonJS `0.2.2` package required by `query-string@7.1.3`. A direct
  version override is unsafe because 0.5.0 is ESM-only and breaks the current
  consumer contract. The regression test bounds malformed input processing.

## Time-bounded accepted findings

Review these exceptions by 2026-10-04, or sooner when Expo publishes a compatible
dependency update. Do not broaden these exceptions to package names or severity
levels; they cover only the advisory IDs below.

### `image-size@1.2.1`

- `GHSA-w3rx-r6r6-pgpr`
- `GHSA-5p2g-fcmc-qvqq`

There is no non-vulnerable version published to npm. The dependency comes from
Metro and reads local app assets during bundling; Trak does not expose it as a
runtime upload parser. Forcing another Metro or React Native version would move
the app outside Expo SDK 57's supported set. Remove this exception when Expo's
supported Metro chain contains a fixed parser.

### `uuid@7.0.3`

- `GHSA-w5hq-g745-h8pq`

This dependency comes from the `xcode` configuration tool. The vulnerable APIs
are UUID v3/v5/v6 when callers provide a buffer; `xcode@3.0.1` calls only
`uuid.v4()` without a buffer. It is build-time code and is not shipped as an app
feature. Remove this exception when Expo's supported configuration chain upgrades
`xcode` or `uuid`.
