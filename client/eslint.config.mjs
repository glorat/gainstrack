import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      'dist/**', 'node_modules/**', 'public/play/**',
      'src-capacitor/**', 'src-cordova/**', '.quasar/**', 'functions/**',
      '.postcssrc.js', 'postcss.config.js',
    ]
  },

  js.configs.recommended,
  tseslint.configs.recommended,
  pluginVue.configs['flat/essential'],

  // TypeScript parser inside .vue files
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser }
    }
  },

  // Project-wide globals and rule overrides
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ga: 'readonly',
        cordova: 'readonly',
        __statics: 'readonly',
        __QUASAR_SSR__: 'readonly',
        __QUASAR_SSR_SERVER__: 'readonly',
        __QUASAR_SSR_CLIENT__: 'readonly',
        __QUASAR_SSR_PWA__: 'readonly',
        process: 'readonly',
        Capacitor: 'readonly',
        chrome: 'readonly',
      }
    },
    rules: {
      'generator-star-spacing': 'off',
      'arrow-parens': 'off',
      'one-var': 'off',
      'prefer-promise-reject-errors': 'off',
      quotes: ['warn', 'single', { avoidEscape: true }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'vue/require-v-for-key': 'off',
      'vue/no-unused-components': 'warn',
      'vue/multi-word-component-names': 'off',
      'vue/no-deprecated-model-definition': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      indent: 'off',
      semi: 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-this-alias': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-debugger': 'off',
    }
  }
)
