module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Explicit for Hermes: RN 0.81 core ships #private class syntax; in this
    // monorepo the preset's automatic Hermes profile misses it (Babel version
    // skew across the two dependency trees), so we pin the transforms.
    plugins: [
      "@babel/plugin-transform-class-properties",
      "@babel/plugin-transform-private-methods",
      "@babel/plugin-transform-private-property-in-object",
    ],
  };
};
