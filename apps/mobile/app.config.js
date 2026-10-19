// Dynamic config layered on app.json.
// WII_DEVICE_TEST=1 → local device builds signed with a free Apple Personal
// Team, which cannot sign the Associated Domains and Push Notifications
// capabilities. Strips exactly those two; the store/TestFlight config (paid
// team) is the untouched app.json. Push registration fails gracefully in-app.
module.exports = ({ config }) => {
  if (process.env.WII_DEVICE_TEST !== "1") return config;
  return {
    ...config,
    ios: { ...config.ios, associatedDomains: undefined },
    plugins: (config.plugins ?? []).filter((p) => (Array.isArray(p) ? p[0] : p) !== "expo-notifications"),
    extra: { ...(config.extra ?? {}), deviceTestBuild: true },
  };
};
