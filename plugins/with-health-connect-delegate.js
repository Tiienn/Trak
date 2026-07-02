/**
 * react-native-health-connect needs its permission delegate registered in
 * MainActivity.onCreate, or requesting permissions crashes with
 * "lateinit property requestPermission has not been initialized".
 * The library's own plugin only patches AndroidManifest, so we inject the
 * registration here. Runs at `expo prebuild` — safe to re-run (idempotent).
 */
const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

/** Android 14+ also requires a VIEW_PERMISSION_USAGE activity-alias, or Health
 *  Connect refuses to show the permission dialog at all. */
function withPermissionUsageAlias(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    app['activity-alias'] = app['activity-alias'] ?? [];
    const exists = app['activity-alias'].some(
      (a) => a.$?.['android:name'] === 'ViewPermissionUsageActivity'
    );
    if (!exists) {
      app['activity-alias'].push({
        $: {
          'android:name': 'ViewPermissionUsageActivity',
          'android:exported': 'true',
          'android:targetActivity': '.MainActivity',
          'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
            category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
          },
        ],
      });
    }
    return config;
  });
}

module.exports = function withHealthConnectDelegate(config) {
  config = withPermissionUsageAlias(config);
  return withMainActivity(config, (config) => {
    let src = config.modResults.contents;
    if (!src.includes('HealthConnectPermissionDelegate')) {
      src = src.replace(
        'import expo.modules.ReactActivityDelegateWrapper',
        'import expo.modules.ReactActivityDelegateWrapper\n\nimport dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate'
      );
      src = src.replace(
        'super.onCreate(null)',
        'super.onCreate(null)\n    // react-native-health-connect: register the permission dialog launcher.\n    HealthConnectPermissionDelegate.setPermissionDelegate(this)'
      );
    }
    config.modResults.contents = src;
    return config;
  });
};
