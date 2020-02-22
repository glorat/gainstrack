<template>

</template>

<script lang="ts">
    import Vue from 'vue';
    import * as firebase from 'firebase/app';

    // Add the Firebase services that you want to use
    import 'firebase/analytics';
    const firebaseConfig = {
        apiKey: 'AIzaSyCeQ9DEdajlDGPxz1yLYnnn51AtS671ZPA',
        authDomain: 'gainstrack-poc.firebaseapp.com',
        databaseURL: 'https://gainstrack-poc.firebaseio.com',
        projectId: 'gainstrack-poc',
        storageBucket: 'gainstrack-poc.appspot.com',
        messagingSenderId: '975553518995',
        appId: '1:975553518995:web:ef5ae5f93fbc0295131c66',
        measurementId: 'G-KGML8QWTGL'
    };
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    Vue.prototype.$analytics = firebase.analytics();

    export default Vue.extend({
        name: 'MyFirebase',

        created(): void {
            this.$router.afterEach(( to, from ) => {
                Vue.prototype.$analytics.logEvent('page_view', {page_path: to.path})
            });
        }
    })

</script>

<style scoped>

</style>
