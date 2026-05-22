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
      files: ["apps/desktop/src/**/*.ts", "apps/desktop/src/**/*.tsx"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
    {
      // Proxy file reconstructed from JS — skip all type checks
      files: ["apps/desktop/src/main/proxy/**/*.ts"],
      rules: {
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "no-empty": "off",
        "no-useless-escape": "off",
      },
    },
  ],
};
