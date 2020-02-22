<template>

</template>

<script>
    import * as Sentry from '@sentry/browser';
    import * as Integrations from '@sentry/integrations';

    const sentryIntegration = (process.env.NODE_ENV === 'development') ? [] : [new Integrations.Vue({
        Vue,
        attachProps: true,
        logErrors: 'true' === process.env.VUE_APP_SENTRY_LOG_ERRORS
    })];

    Sentry.init({
        dsn: 'https://842809e35b06430997c7e8d9ad5ac592@sentry.io/2041653',
        environment: process.env.NODE_ENV,
        release: 'gainstrack@' + process.env.VUE_APP_VERSION,
        integrations: sentryIntegration,
    });

    export default {
        name: 'MySentry'
    }
</script>

<style scoped>

</style>
