// ESLint for the Node workspaces (packages/shared, apps/api).
// apps/web has its own config, built on Next's.
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["**/dist/**", "**/coverage/**", "apps/web/**", "apps/api/src/generated/**"]),

  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        // Type information for the type-aware rules. These tsconfigs include tests and config files too.
        project: ["./packages/shared/tsconfig.check.json", "./apps/api/tsconfig.check.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      eqeqeq: ["error", "always"],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
    },
  },

  {
    // Response bodies from supertest are `any`; asserting on them is the point of the tests
    files: ["**/*.test.ts", "apps/api/test/**"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      // Fakes implement async interfaces without needing to await anything
      "@typescript-eslint/require-await": "off",
    },
  },

  {
    // Plain JS config files aren't in any tsconfig
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Last: turns off rules that would fight Prettier
  eslintConfigPrettier,
]);
