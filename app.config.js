module.exports = ({ config }) => {
  const isTesting = process.env.APP_VARIANT === 'testing';
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
    name: isTesting ? 'Trak Test' : config.name,
    plugins,
    android: {
      ...config.android,
      package: isTesting ? 'com.tien.trak.testing' : config.android?.package,
    },
  };
};
