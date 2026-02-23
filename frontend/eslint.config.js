import eslint from '@eslint/js';
import reactRecommended from 'eslint-plugin-react/configs/recommended.js';
import globals from 'globals';

export default [
  eslint.configs.recommended,
  {
    ...reactRecommended,
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
        ...reactRecommended.languageOptions,
        globals: {
            ...globals.browser,
            ...globals.node
        }
    },
    settings: {
        react: {
            version: "detect"
        }
    },
    rules: {
        ...reactRecommended.rules,
        "react/react-in-jsx-scope": "off",
        "react/prop-types": "off",
        "no-unused-vars": ["error", { "vars": "all", "args": "after-used", "ignoreRestSiblings": false, "caughtErrorsIgnorePattern": "^_" }]
    }
  },
  {
    ignores: ["dist/", "node_modules/", "eslint.config.js"],
  },
];
