<template>
    <aside class="myaside">
    <ul v-for="menuItems in config.navigation_bar" class="navigation">
        <li v-for="id in menuItems">
            <router-link v-bind:to="'/' + id">{{ config.all_pages[id][0]  }}</router-link>
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

    export default {
        name: "MyAside",
        methods: {
            beforeUpload(file:File) {
                if (file.name.match(/\.gainstrack$/)) {
                    console.log(`Trying to upload a ${file.type} of size ${file.size}`);
                    let reader = new FileReader();
                    reader.onload = function() {
                        const text = reader.result;
                        axios.put('/api/source/', {source : text, filePath: '', entryHash:'', sha256sum:''})
                            .then(response => console.log('Saved'));
                    };
                    reader.onerror = function() {
                        console.log(reader.result);
                    };
                    reader.readAsText(file);
                }
                else {
                    console.log("Can only upload .gainstrack files");
                }
                return false;
            }
        },
        data: function() {
            return {
                menuItems: ['foo', 'bar'],
                config: {
                    all_pages: {
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
                    navigation_bar: [
                        ['command'],
                        ['income_statement', 'balance_sheet', 'trial_balance', 'journal', 'query'],
                        ['irr'],
                        ['holdings', 'prices', 'events', 'statistics'],
                        ['editor', 'import', 'options', 'help']
                    ]
                }
            };
        }
    }
</script>

<style>
    .myaside .el-upload-dragger {
        width: var(--aside-width);
        height: auto;
    }
</style>
