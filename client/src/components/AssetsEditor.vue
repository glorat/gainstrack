<template>
    <table>
        <tr>
            <th>Asset</th>
            <th>Live ticker</th>
            <th>Live proxy</th>
            <th>Tags</th>
            <th>Actions</th>
        </tr>
        <tr v-for="asset in assets" :key="asset.asset">
            <td>
                {{ asset.asset }}</td>
            <td><el-input type="text" v-model="asset.options.ticker"></el-input></td>
            <td><el-input type="text" v-model="asset.options.proxy"></el-input></td>
            <td>  <el-select v-model="asset.options.tags" v-on:input="assetTouched(asset)" multiple allow-create
                             filterable default-first-option placeholder="Select">
                <el-option
                        v-for="item in allTags"
                        :key="item"
                        :label="item"
                        :value="item">
                </el-option>
            </el-select></td>
            <td>
                <el-button type="info" size="mini" icon="el-icon-refresh" circle @click="assetReset(asset)" :disabled="!asset.dirty"></el-button>
                <el-button type="success" size="mini" icon="el-icon-check" circle @click="assetSave(asset)" :disabled="!asset.dirty"></el-button>
            </td>
        </tr>

    </table>
</template>

<script>
    import axios from 'axios';
    import {flatten, uniq, cloneDeep} from 'lodash';
    import {Option, Select, Button, Input} from 'element-ui';

    export default {
        name: 'AssetsEditor',
        components: {
            'el-select': Select,
            'el-option': Option,
            'el-button': Button,
            'el-input': Input,
        },
        data() {
            return {
                // All commands that are asset commands
                assets: [],
                originalAssets: [],
            };
        },
        computed: {
            allTags() {
                return uniq(flatten(this.assets.map(x => x.options.tags)));
            },
        },
        methods: {
            assetTouched(asset) {
                this.$set(asset, 'dirty', true);
            },
            assetReset(asset) {
                const orig = this.originalAssets.find(x => x.asset === asset.asset);
                const idx = this.assets.indexOf(asset);
                Object.assign(this.assets[idx], cloneDeep(orig));
                this.$set(this.assets[idx], 'dirty', false);
            },
            toGainstrack(asset) {
                let str = `1900-01-01 commodity ${asset.asset}`;
                for (const [key, value] of Object.entries(asset.options)) {
                    if (key === 'tags' && value.length > 0) {
                        str += `\n tags: ${value.join(',')}`
                    } else if (value !== '') {
                        str += `\n  ${key}: ${value}`
                    }
                }
                return str;
            },
            assetSave(asset) {
                const str = this.toGainstrack(asset);
                alert(str);
                axios.post('/api/post/asset', {str})
                    .then(response => {
                        this.$notify.success(response.data);
                        const orig = this.originalAssets.find(x => x.asset === asset.asset);
                        const idx = this.originalAssets.indexOf(orig);
                        Object.assign(this.originalAssets[idx], cloneDeep(asset));
                    })
                    .catch(error => this.$notify.error(error.response.data))
            },
            async reloadAll() {
                return axios.get('/api/assets')
                    .then(response => {
                        this.originalAssets = response.data;

                    })
                    .catch(error => this.$notify.error(error))
            },
        },
        async mounted() {
            await this.reloadAll();
            this.assets = cloneDeep(this.originalAssets) ;
        },
    }
</script>

<style scoped>

</style>