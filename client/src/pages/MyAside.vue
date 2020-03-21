<template>
    <q-scroll-area class="fit myaside">
        <q-list v-for="(menuItems, index) in menuItemsList" :key="index">
            <div v-for="(menuItem, idx2) in menuItems" :key="idx2">
                <q-item dense clickable v-ripple :to="menuItem.path" :id="`route-${menuItem.path.replace('/','')}`">
                    <q-item-section avatar>
                        <q-icon :name="menuItem.meta.icon" />
                    </q-item-section>
                    <q-item-section>
                        {{ menuItem.meta.title }}
                    </q-item-section>
                </q-item>

                <q-item v-if="menuItem.path=='/editor' && errors.length>0" dense clickable v-ripple to="/errors">
                    <q-item-section avatar>
                        <q-badge color="red" text-color="black" :label="errors.length" />
                    </q-item-section>
                    <q-item-section>
                        Errors
                    </q-item-section>
                </q-item>
            </div>
            <q-separator />
        </q-list>
        <q-list>
            <q-item>
                <login-form></login-form>
            </q-item>
            <q-item>Ver: {{ version }}</q-item>
        </q-list>
    </q-scroll-area>

</template>


<script lang="ts">
    import LoginForm from '@/components/LoginForm.vue';
    import Vue from 'vue'
    import routes from '@/router/config';

    export default Vue.extend({

        data() {
            const navBar = [
                    ['add', 'command'],
                ['balance_sheet', 'income_statement', 'journal'],
                ['irr', 'aa', 'pnlexplain'],
                ['prices', 'quotes', 'settings'],
                ['port', 'editor', 'history'],
                ['help', 'faq']
            ];
            return {
                menuItemsList: navBar.map(ss => {
                    return ss.map((key: string) => {
                        return routes.find(rt => rt.path === `/${key}`);
                    });
                })
            }
        },
        components: {LoginForm},
        computed: {
            version() {
                return this.$appVersion;
            },
            errors() {
                return this.$store.state.parseState.errors;
            },
            errorClass() {
                return this.$store.state.parseState.errors.length > 0 ? 'error' : 'error hidden';
            }
        }
    })
</script>

<style>
    .myaside .el-upload-dragger {
        width: var(--aside-width);
        height: auto;
    }

    aside .router-link-active {
        color: var(--color-sidebar-text-hover);
        background-color: var(--color-sidebar-border);
    }

</style>
