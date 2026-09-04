module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT;
  const isTesting = variant === 'testing';
  const isE2E = variant === 'e2e';
  const plugins = isTesting
    ? config.plugins?.map((plugin) => {
        if (!Array.isArray(plugin) || plugin[0] !== 'expo-build-properties') return plugin;
        return [
          plugin[0],
          {
            ...plugin[1],
            android: {
              ...plugin[1]?.android,
              // Physical test phones use arm64. Keeping this test-only avoids
              // compiling three emulator/legacy ABIs into every local APK.
              buildArchs: ['arm64-v8a'],
            },
          },
        ];
      })
    : config.plugins;

  return {
    ...config,
    name: isE2E ? 'Trak E2E' : isTesting ? 'Trak Test' : config.name,
    plugins,
    ios: {
      ...config.ios,
      bundleIdentifier: isE2E ? 'com.tien.trak.e2e' : config.ios?.bundleIdentifier,
    },
    android: {
      ...config.android,
      package: isE2E
        ? 'com.tien.trak.e2e'
        : isTesting
          ? 'com.tien.trak.testing'
          : config.android?.package,
    },
  };
};
