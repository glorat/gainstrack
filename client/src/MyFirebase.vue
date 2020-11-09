<template>
    <div></div>
</template>

<script lang="ts">
    import Vue from 'vue';
    import * as firebase from 'firebase/app';

    // Add the Firebase services that you want to use
    import 'firebase/analytics';
    const firebaseConfig = {
      apiKey: 'AIzaSyBFgCa2tMUSuAWxiyAPa5U90peuqAJNNBo',
      authDomain: 'gainstrack.firebaseapp.com',
      databaseURL: 'https://gainstrack.firebaseio.com',
      projectId: 'gainstrack',
      storageBucket: 'gainstrack.appspot.com',
      messagingSenderId: '248761590066',
      appId: '1:248761590066:web:dcd7d7a8e1028f7b1bf72b',
      measurementId: 'G-H8SQPQVX1S'
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    Vue.prototype.$analytics = firebase.analytics();

    export default Vue.extend({
        name: 'MyFirebase',

        created(): void {
            this.$router.afterEach(( to ) => {
                Vue.prototype.$analytics.logEvent('page_view', {page_path: to.path})
            });
        }
    })

</script>

<style scoped>

</style>
