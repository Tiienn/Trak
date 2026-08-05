/**
 * react-native-health-connect needs its permission delegate registered in
 * MainActivity.onCreate, or requesting permissions crashes with
 * "lateinit property requestPermission has not been initialized".
 * The library's own plugin only patches AndroidManifest, so we inject the
 * registration here. Runs at `expo prebuild` — safe to re-run (idempotent).
 */
const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withDangerousMod,
  withMainActivity,
} = require('@expo/config-plugins');

const PRIVACY_URL =
  'https://tqhgdnmzhuczuyyrmvzx.supabase.co/functions/v1/privacy';

function withPermissionsRationaleActivity(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const packageName = config.android?.package;
      if (!packageName) throw new Error('Android package is required for Health Connect.');
      const javaDir = path.join(
        config.modRequest.projectRoot,
        'android/app/src/main/java',
        ...packageName.split('.')
      );
      fs.mkdirSync(javaDir, { recursive: true });
      fs.writeFileSync(
        path.join(javaDir, 'PermissionsRationaleActivity.kt'),
        `package ${packageName}\n\n` +
          `import android.app.Activity\n` +
          `import android.os.Bundle\n` +
          `import android.webkit.WebView\n` +
          `import android.webkit.WebViewClient\n\n` +
          `class PermissionsRationaleActivity : Activity() {\n` +
          `  override fun onCreate(savedInstanceState: Bundle?) {\n` +
          `    super.onCreate(savedInstanceState)\n` +
          `    title = "Trak Privacy Policy"\n` +
          `    val webView = WebView(this)\n` +
          `    webView.webViewClient = WebViewClient()\n` +
          `    webView.settings.javaScriptEnabled = false\n` +
          `    webView.loadUrl("${PRIVACY_URL}")\n` +
          `    setContentView(webView)\n` +
          `  }\n` +
          `}\n`
      );
      return config;
    },
  ]);
}

/** Android 14+ also requires a VIEW_PERMISSION_USAGE activity-alias, or Health
 *  Connect refuses to show the permission dialog at all. */
function withPermissionUsageAlias(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    app.activity = app.activity ?? [];

    // The library points the privacy-policy action at MainActivity. Replace
    // that with a dedicated screen so Health Connect always opens the policy.
    for (const activity of app.activity) {
      activity['intent-filter'] = (activity['intent-filter'] ?? []).filter(
        (filter) =>
          !(filter.action ?? []).some(
            (action) =>
              action.$?.['android:name'] ===
              'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE'
          )
      );
    }

    const rationaleName = '.PermissionsRationaleActivity';
    let rationale = app.activity.find((a) => a.$?.['android:name'] === rationaleName);
    if (!rationale) {
      rationale = {
        $: { 'android:name': rationaleName, 'android:exported': 'true' },
        'intent-filter': [],
      };
      app.activity.push(rationale);
    }
    rationale['intent-filter'] = [
      {
        action: [
          {
            $: {
              'android:name': 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE',
            },
          },
        ],
      },
    ];

    app['activity-alias'] = app['activity-alias'] ?? [];
    const existingAlias = app['activity-alias'].find(
      (a) => a.$?.['android:name'] === 'ViewPermissionUsageActivity'
    );
    if (existingAlias) {
      existingAlias.$['android:targetActivity'] = rationaleName;
    } else {
      app['activity-alias'].push({
        $: {
          'android:name': 'ViewPermissionUsageActivity',
          'android:exported': 'true',
          'android:targetActivity': rationaleName,
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
  config = withPermissionsRationaleActivity(config);
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
