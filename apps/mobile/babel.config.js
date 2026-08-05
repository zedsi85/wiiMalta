// babel-preset-expo MUST stay on the SDK-matched major (54.x for expo ~54).
// A newer preset (57.x got in once) targets "Hermes V1" and keeps native
// `class`/#private syntax, which this SDK's Hermes rejects — the app then
// dies in Expo Go at startup and `expo export` fails in hermesc.
// Verify after dependency changes: `npx expo export --platform ios` must pass.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
