import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      // This must be "module" because you are using import/export in this file
      sourceType: "module",
      globals: {
        ...globals.node,
        // Using built-in Node test globals if you aren't using Jest
        ...globals.mocha,
      },
    },
    rules: {
      // Changes unused variables to an error to keep code clean, 
      // but ignores variables starting with an underscore (e.g., _blogs)
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-console": "off",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];