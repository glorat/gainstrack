/* eslint-env node */
module.exports = {
  'presets': [
    '@quasar/babel-preset-app'
  ],
  'plugins': [
    [
      'component',
      {
        'libraryName': 'element-ui',
        'styleLibraryName': 'theme-chalk'
      }
    ],
      ['lodash']
  ]
}
