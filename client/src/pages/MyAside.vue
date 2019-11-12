<template>
    <aside class="myaside">
    <ul v-for="menuItems in config.navigationBar" class="navigation">
        <li v-bind:key="id" v-for="id in menuItems">
            <router-link v-bind:to="'/' + id">{{ config.allPages[id][0] }}</router-link>
        </li>
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
    </aside>
</template>


<script lang="ts">
    import axios from 'axios';
    import {Upload} from 'element-ui';

    import { Component, Vue } from 'vue-property-decorator';

    @Component({components: {'el-upload': Upload}})
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
                'holdings': ['Holdings', 'g h'],
                'import': ['Import', 'g n'],
                'income_statement': ['Income Statement', 'g i'],
                'journal': ['Journal', 'g j'],
                'options': ['Options', 'g o'],
                'query': ['Query', 'g q'],
                'statistics': ['Statistics', 'g x'],
                'trial_balance': ['Trial Balance', 'g t'],

                'irr':              ['IRR',    ''],
                'command': ['Commands', '']
            },
            navigationBar: [
                ['command'],
                ['balance_sheet', 'income_statement', 'journal'],
                ['irr'],
                ['prices'],
                ['editor']
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
                        .then(() => store.dispatch('reload'));
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
