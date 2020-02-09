<template>
    <aside class="myaside">
        <ul class="navigation">
            <li>
                <router-link v-bind:to="'/add'"><span class="el-icon-circle-plus-outline"></span> {{ config.allPages['add'][0] }}</router-link>
            </li>
        </ul>

        <ul v-for="menuItems in config.navigationBar" class="navigation">
            <template v-for="id in menuItems">
                <li>
                    <router-link v-bind:to="'/' + id">{{ config.allPages[id][0] }}</router-link>
                </li>
                <li v-if="id=='editor'" :class="errorClass">
                  <router-link active-class="error" v-bind:to="'/errors'">Errors <span class="bubble">{{errors.length}}</span>
                  </router-link>
                </li>
            </template>
        </ul>
        <div>
            <login-form></login-form>
        </div>
        <div>Ver: {{ version }}</div>
    </aside>
</template>


<script lang="ts">
    import LoginForm from '@/components/LoginForm.vue';
    import axios from 'axios';
    import {Upload} from 'element-ui';

    import { Component, Vue } from 'vue-property-decorator';

    @Component({
        components: {LoginForm, 'el-upload': Upload},
        computed: {
            version() {
                return process.env.VUE_APP_VERSION;
            },
            errors() {
                return this.$store.state.parseState.errors;
            },
            errorClass() {
                return this.$store.state.parseState.errors.length > 0 ? 'error' : 'error hidden';
            }
        }
    })
    export default class extends Vue {

        private menuItems: string[] = ['foo', 'bar'];
        /* tslint:disable:object-literal-key-quotes */
        private config: any = {
            allPages: {
                'balance_sheet': ['Balance Sheet', 'g b'],
                'prices': ['Trade Prices', 'g c'],
                'quotes': ['Market Quotes', ''],
                'settings': ['Settings', ''],
                'editor': ['Editor', 'g e'],
                'port': ['Import/Export', ''],
                'history': ['History', ''],
                'errors': ['Errors', ''],
                'events': ['Events', 'g E'],
                'help': ['Help', 'g H'],
                'faq': ['FAQ', ''],
                'holdings': ['Holdings', 'g h'],
                'import': ['Import', 'g n'],
                'income_statement': ['Income Statement', 'g i'],
                'journal': ['Journal', 'g j'],
                'options': ['Options', 'g o'],
                'query': ['Query', 'g q'],
                'statistics': ['Statistics', 'g x'],
                'trial_balance': ['Trial Balance', 'g t'],
                'irr':              ['IRR',    ''],
                'aa': ['Asset Allocation', ''],
                'pnlexplain': ['P&L Explain', ''],
                'command': ['Commands', ''],
                'add': ['Add Record', ''],
            },
            navigationBar: [
                ['command'],
                ['balance_sheet', 'income_statement', 'journal'],
                ['irr', 'aa', 'pnlexplain'],
                ['prices', 'quotes', 'settings'],
                ['port', 'editor', 'history'],
                ['help', 'faq']
            ]
        };

    }
</script>

<style>
    .myaside .el-upload-dragger {
        width: var(--aside-width);
        height: auto;
    }

    .myaside .router-link-active {
        color: var(--color-sidebar-text-hover);
        background-color: var(--color-sidebar-border);
    }
</style>
