import {boot} from 'quasar/wrappers';
import * as Sentry from '@sentry/vue';
import {router} from 'src/router'
import version from '../../package.json'

export default boot(({app}) => {

  // const sentryOn = process.env.NODE_ENV !== 'development';
  const sentryOn = true;

  if (sentryOn) {
    Sentry.init({
      app,
      dsn: 'https://842809e35b06430997c7e8d9ad5ac592@o346261.ingest.sentry.io/2041653',
      integrations: [
        Sentry.browserTracingIntegration({ router }),
      ],
      tracePropagationTargets: ['localhost', 'boglebot.com', 'poc.gainstrack.com', /^\//],
      attachProps: true,
      logErrors: true,
      tracesSampleRate: 1.0,
      release: 'gainstrack@' + version.version,
      environment: process.env.NODE_ENV
    });
  }
})
