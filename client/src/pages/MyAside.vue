<template>
    <aside class="myaside">
        <ul v-for="menuItems in config.navigationBar" class="navigation">
            <template v-for="id in menuItems">
                <li>
                    <router-link v-bind:to="'/' + id">{{ config.allPages[id][0] }}</router-link>
                </li>
                <li v-if="id=='editor'" :class="errorClass">
                    <router-link active-class="error" v-bind:to="'/errors'">Errors <span class="bubble">{{ errors.length }}</span></router-link>
                </li>
            </template>
        </ul>
        <el-upload
                class=""
                drag
                action="/api/postssss/"
                :before-upload="beforeUpload"
                >
            <i class="el-icon-upload"></i>
            <div class="el-upload__text">Drop file here or<br><em>click to upload</em></div>
        </el-upload>
        <ul class="navigation">
            <li><a href="/api/export/gainstrack">Save...</a></li>
            <li><a href="/api/export/beancount">Export to Beancount</a></li>
        </ul>
    </aside>
</template>


<script lang="ts">
    import axios from 'axios';
    import {Upload} from 'element-ui';

    import { Component, Vue } from 'vue-property-decorator';

    @Component({
        components: {'el-upload': Upload},
        computed: {
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
                'prices': ['Prices', 'g c'],
                'editor': ['Editor', 'g e'],
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
                'command': ['Commands', ''],
            },
            navigationBar: [
                ['command'],
                ['balance_sheet', 'income_statement', 'journal'],
                ['irr', 'aa'],
                ['prices'],
                ['editor'],
                ['help', 'faq']
            ]
        };

        private beforeUpload(file: File) {
            const notify = this.$notify;
            const store = this.$store;

            if (file.name.match(/\.gainstrack$/)) {
                // console.log(`Trying to upload a ${file.type} of size ${file.size}`);
                const reader = new FileReader();
                reader.onload = () => {
                    const text = reader.result;
                    axios.put('/api/source/', {source: text, filePath: '', entryHash: '', sha256sum: ''})
                        .then(response => notify.success('Reloaded'))
                        .then(() => store.dispatch('reload'))
                        // A bit of a hack to force a refresh of local state in current view
                        .then(() => this.$router.go(0))
                };
                reader.onerror = () => {
                    notify.error(reader.result as string)
                };
                reader.readAsText(file);
            } else {
                notify.warning('Can only upload .gainstrack files');
            }
            return false;
        }
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
