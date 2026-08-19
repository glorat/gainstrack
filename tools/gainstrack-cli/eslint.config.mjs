// Mirrors client/eslint.config.mjs minus everything Vue and browser — this package is a Node CLI.
// Kept in step deliberately: what is left here is the node-only rim around code that lives in
// client/src/, and it should not drift stylistically away from it.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  // dist/ is the esbuild bundle — generated, and it carries client/src through it.
  { ignores: ['node_modules/**', '.cache/**', 'dist/**'] },

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      quotes: ['warn', 'single', { avoidEscape: true }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      indent: 'off',
      semi: 'off',
    },
  },
)
