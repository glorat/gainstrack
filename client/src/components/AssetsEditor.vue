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
            <td>
                <el-autocomplete type="text" v-model="asset.options.ticker" v-on:input="assetTouched(asset)"
                          :fetch-suggestions="tickerSearch"></el-autocomplete>
            </td>
            <td>
                <el-autocomplete type="text" v-model="asset.options.proxy" v-on:input="assetTouched(asset)"
                                 :fetch-suggestions="tickerSearch"></el-autocomplete>
            </td>
            <td width="250px">
                <el-select size="mini" v-model="asset.options.tags" v-on:input="assetTouched(asset)" multiple
                           allow-create
                           filterable default-first-option placeholder="Select">
                    <el-option
                            v-for="item in allTags"
                            :key="item"
                            :label="item"
                            :value="item">
                    </el-option>
                </el-select>
            </td>
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
    import {Option, Select, Button, Input, Autocomplete} from 'element-ui';

    export default {
        name: 'AssetsEditor',
        components: {
            'el-select': Select,
            'el-option': Option,
            'el-button': Button,
            'el-input': Input,
            'el-autocomplete': Autocomplete,
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
            tickerSearch(queryString, cb) {
                let cfgs = this.$store.state.quoteConfig;
                if (queryString) {
                    cfgs = cfgs.filter(x => x.avSymbol.indexOf(queryString.toUpperCase()) > -1)
                }
                const elems = cfgs.map(cfg => { return {
                    value: cfg.avSymbol
                }});
                cb(elems);
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
    .el-select {
        display: block;
    }
</style>