import { configure } from 'quasar/wrappers'

const proxyConfig = Object.fromEntries(
  ['/api', '/gainstrack', '/functions'].map(path => [
    path,
    { target: 'https://poc.gainstrack.com', changeOrigin: true, secure: false }
  ])
)

export default configure(function (ctx) {
  return {
    boot: [
      'notify',
      'components',
      'sentry'
    ],

    css: ['app.sass'],

    extras: [],

    build: {
      vueRouterMode: 'history',
      sourceMap: ctx.dev || ctx.debug || ctx.publish === 'sentry',
    },

    devServer: {
      port: 8080,
      open: false,
      proxy: proxyConfig,
    },

    framework: {
      iconSet: 'svg-material-icons',
      lang: 'en-US',
      config: {},
      plugins: ['Notify', 'LoadingBar', 'Dialog', 'Meta'],
    },

    animations: [],

    ssr: { pwa: false },

    pwa: {
      workboxPluginMode: 'GenerateSW',
      workboxOptions: {},
      manifest: {
        name: 'Gainstrack',
        short_name: 'Gainstrack',
        description: 'A Quasar Framework app',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#027be3',
        icons: [
          { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-256x256.png', sizes: '256x256', type: 'image/png' },
          { src: 'icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    },

    capacitor: {
      hideSplashscreen: true
    },
  }
})
