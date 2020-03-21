<template>
        <q-layout view="hHh LpR fFf" class="bg-grey-1">
            <q-header>
                <q-toolbar>
                    <q-btn flat @click="drawer = !drawer" round dense icon="menu"></q-btn>
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
                        <tour></tour>
                        <router-view></router-view>
<!--                    </article>-->
<!--                </q-page>-->
                <ul id="notifications" class="notifications"></ul>

            </q-page-container>
        </q-layout>

</template>

<script>
    import MyAside from './MyAside';
    import FilterForm from '../components/FilterForm';
    const Tour = () => import ('../Tour');

    const menuList = [
        {
            icon: 'inbox',
            label: 'Inbox',
            separator: true
        },
        {
            icon: 'send',
            label: 'Outbox',
            separator: false
        },
        {
            icon: 'delete',
            label: 'Trash',
            separator: false
        },
        {
            icon: 'error',
            label: 'Spam',
            separator: true
        },
        {
            icon: 'settings',
            label: 'Settings',
            separator: false
        },
        {
            icon: 'feedback',
            label: 'Send Feedback',
            separator: false
        },
        {
            icon: 'help',
            iconColor: 'primary',
            label: 'Help',
            separator: false
        }
    ]

    export default {
        name: 'MyQLayout',
        components: { MyAside, Tour, FilterForm },
        mounted() {
            this.$router.afterEach((to, from) => {
                this.pageTitle = (to.meta.title || 'Gainstrack');
            });
            this.pageTitle = this.$router.currentRoute.meta.title;

            // Get some state on startup
            this.$store.dispatch('reload');

        },
        data () {
            return {
                menuList,
                left: false,
                drawer: false,
                pageTitle: ''
            }
        }
    };
</script>

<style scoped>
    article {
        padding: 1.5em
    }
</style>
