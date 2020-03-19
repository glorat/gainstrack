<template>
    <q-layout view="hHh lpR fFf">
        <q-header elevated class="bg-primary text-white">
            <q-toolbar>
                <q-btn dense flat round icon="menu" @click="left = !left"/>
                <q-toolbar-title>
                    Gainstrack
                </q-toolbar-title>
            </q-toolbar>
        </q-header>

        <q-drawer v-model="left" side="left" bordered>
            <my-aside></my-aside>
        </q-drawer>

        <q-page-container>
            <router-view/>
        </q-page-container>

    </q-layout>
</template>

<script>
  import MyAside from './MyAside';
  export default {
    name: 'MyQLayout',
      components: { MyAside },
      data () {
          return {
              left: false
          }
      }
  };
</script>

<style scoped>

</style>
