module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Inlines Drizzle's .sql migration files as strings.
    plugins: [["inline-import", { extensions: [".sql"] }]],
  };
};
