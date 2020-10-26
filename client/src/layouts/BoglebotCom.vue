<template>
  <q-layout view="hHh LpR fFf" class="bg-grey-1">
    <q-header>
      <q-toolbar>
        <q-btn flat @click="drawer = !drawer" round dense :icon="matMenu"></q-btn>
        <q-toolbar-title>Boglebot</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="drawer"
      show-if-above
      :width="240"
      :breakpoint="500"
      content-class="bg-grey-3"
    >
      <my-aside hide-login></my-aside>
    </q-drawer>

    <q-page-container>
      <router-view></router-view>
      <ul id="notifications" class="notifications"></ul>

    </q-page-container>
  </q-layout>

</template>

<script>
  import MyAside from '../pages/MyAside';
  import { matMenu } from '@quasar/extras/material-icons';


  export default {
    name: 'BoglebotCom',
    components: { MyAside },
    mounted() {
      this.$router.afterEach((to) => {
        this.pageTitle = (to.meta.title || 'Boglebot');
      });
      this.pageTitle = this.$router.currentRoute.meta.title;

      // Get some state on startup
      this.$store.dispatch('reload');

    },
    data () {
      return {
        left: false,
        drawer: false,
        pageTitle: '',
        matMenu,
      }
    }
  };
</script>

<style scoped>
  article {
    padding: 1.5em
  }
</style>
