module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/consistent-type-imports": "error",
  },
  ignorePatterns: ["dist/", "node_modules/", ".turbo/"],
  overrides: [
    {
      // Electron main process — deals with dynamic DB objects and config files
      files: ["apps/desktop/src/main/**/*.ts"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
};
