<template>
        <q-layout view="hHh LpR fFf" class="bg-grey-1">
            <q-header>
                <q-toolbar>
                    <q-btn flat @click="drawer = !drawer" round dense :icon="matMenu"></q-btn>
                    <q-toolbar-title>Gainstrack</q-toolbar-title>
                    <filter-form></filter-form>
                </q-toolbar>
            </q-header>

            <q-drawer
                    v-model="drawer"
                    show-if-above
                    :width="240"
                    :breakpoint="500"
                    content-class="bg-grey-3"
            >
                <my-aside></my-aside>
            </q-drawer>

            <q-page-container>
<!--                <q-page>-->
<!--                    <article>-->
<!-- Not vue3 ready                       <tour></tour>-->
                        <router-view></router-view>
<!--                    </article>-->
<!--                </q-page>-->
                <ul id="notifications" class="notifications"></ul>

            </q-page-container>
        </q-layout>

</template>

<script setup lang="ts">
import MyAside from '../pages/MyAside.vue'
import FilterForm from '../components/FilterForm.vue'
import { matMenu } from '@quasar/extras/material-icons'
import { useAppStore } from 'src/stores'
import { ref, onMounted } from 'vue'

const store = useAppStore()
const drawer = ref(false)

onMounted(() => {
  store.reload()
})
</script>

<style scoped>
    article {
        padding: 1.5em
    }
</style>
