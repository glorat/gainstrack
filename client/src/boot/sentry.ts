import {boot} from 'quasar/wrappers';
import * as Sentry from '@sentry/vue';
import { BrowserTracing } from '@sentry/tracing';
import {router} from 'src/router'
import version from '../../VERSION.json'

export default boot(({app}) => {

  // const sentryOn = process.env.NODE_ENV !== 'development';
  const sentryOn = true;

  if (sentryOn) {

    const sentryIntegration = [
      new BrowserTracing({
        routingInstrumentation: Sentry.vueRouterInstrumentation(router),
        tracingOrigins: ['localhost', 'boglebot.com', 'poc.gainstrack.com', /^\//],
      }),
    ];

    Sentry.init({
      app,
      dsn: 'https://842809e35b06430997c7e8d9ad5ac592@o346261.ingest.sentry.io/2041653',
      integrations: sentryIntegration,
      attachProps: true,
      logErrors: true,
      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: 1.0,
      release: 'gainstrack@' + version.version,
      environment: process.env.NODE_ENV

    });
  }
})
