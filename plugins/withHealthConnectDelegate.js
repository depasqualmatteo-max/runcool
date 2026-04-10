/**
 * Custom Expo config plugin per Health Connect.
 *
 * Fa due cose che il plugin ufficiale di react-native-health-connect NON fa:
 *
 * 1) Inietta in MainActivity.kt la chiamata
 *    HealthConnectPermissionDelegate.setPermissionDelegate(this)
 *    dentro onCreate(). Senza di questa, il lateinit var ActivityResultLauncher
 *    non viene inizializzato e requestPermission() non mostra il dialog.
 *
 * 2) Aggiunge all'AndroidManifest.xml:
 *    - intent-filter VIEW_PERMISSION_USAGE / HEALTH_PERMISSIONS (richiesto da
 *      Health Connect su Android 14+ per riconoscere l'app come richiedente
 *      permessi sanitari)
 *    - intent-filter ACTION_SHOW_PERMISSIONS_RATIONALE (pre-Android 14 fallback,
 *      se non già presente)
 */
const {
  withMainActivity,
  withAndroidManifest,
} = require('@expo/config-plugins');

const IMPORT_LINE =
  'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';

const DELEGATE_CALL =
  'HealthConnectPermissionDelegate.setPermissionDelegate(this)';

function addImport(contents) {
  if (contents.includes(IMPORT_LINE)) return contents;
  return contents.replace(/(^package .+\n)/m, `$1\n${IMPORT_LINE}\n`);
}

function addDelegateCall(contents) {
  if (contents.includes(DELEGATE_CALL)) return contents;

  const onCreateRegex =
    /(override fun onCreate\(savedInstanceState: Bundle\?\) \{\s*)/;

  if (onCreateRegex.test(contents)) {
    return contents.replace(onCreateRegex, `$1    ${DELEGATE_CALL}\n    `);
  }

  return contents.replace(
    /(class MainActivity[^\{]*\{)/,
    `$1
  override fun onCreate(savedInstanceState: android.os.Bundle?) {
    ${DELEGATE_CALL}
    super.onCreate(savedInstanceState)
  }
`
  );
}

const withHealthConnectMainActivity = (config) => {
  return withMainActivity(config, (config) => {
    if (config.modResults.language !== 'kt') {
      throw new Error(
        'withHealthConnectDelegate supporta solo MainActivity in Kotlin'
      );
    }
    let contents = config.modResults.contents;
    contents = addImport(contents);
    contents = addDelegateCall(contents);
    config.modResults.contents = contents;
    return config;
  });
};

/**
 * Aggiunge gli intent-filter richiesti da Health Connect per essere
 * riconosciuto come app che legge dati sanitari.
 *
 * - ACTION_SHOW_PERMISSIONS_RATIONALE: la main activity gestisce la rationale
 * - VIEW_PERMISSION_USAGE: activity-alias richiesta da Android 14+
 */
const withHealthConnectManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application[0];
    const activities = application.activity || [];
    const mainActivity =
      activities.find((a) => a.$?.['android:name'] === '.MainActivity') ||
      activities.find((a) =>
        (a.$?.['android:name'] || '').endsWith('MainActivity')
      ) ||
      activities[0];
    if (!mainActivity) {
      // nessuna activity ancora nel manifest, esco (verrà aggiunta da Expo dopo)
      return config;
    }

    // 1) Intent-filter rationale sulla main activity
    if (!mainActivity['intent-filter']) mainActivity['intent-filter'] = [];
    const hasRationale = mainActivity['intent-filter'].some((f) =>
      (f.action || []).some(
        (a) =>
          a.$?.['android:name'] ===
          'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE'
      )
    );
    if (!hasRationale) {
      mainActivity['intent-filter'].push({
        action: [
          {
            $: {
              'android:name':
                'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE',
            },
          },
        ],
      });
    }

    // 2) Activity-alias per VIEW_PERMISSION_USAGE (Android 14+)
    if (!application['activity-alias']) application['activity-alias'] = [];
    const hasAlias = application['activity-alias'].some(
      (a) => a.$?.['android:name'] === 'ViewPermissionUsageActivity'
    );
    if (!hasAlias) {
      application['activity-alias'].push({
        $: {
          'android:name': 'ViewPermissionUsageActivity',
          'android:exported': 'true',
          'android:targetActivity': '.MainActivity',
          'android:permission':
            'android.permission.START_VIEW_PERMISSION_USAGE',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE',
                },
              },
            ],
            category: [
              {
                $: {
                  'android:name': 'android.intent.category.HEALTH_PERMISSIONS',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
};

const withHealthConnectDelegate = (config) => {
  config = withHealthConnectMainActivity(config);
  config = withHealthConnectManifest(config);
  return config;
};

module.exports = withHealthConnectDelegate;
