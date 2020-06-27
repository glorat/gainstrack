<template>
    <el-autocomplete type="text" :value="value" v-on:input="onSelectChanged($event)"
                     :fetch-suggestions="assetSearch" size="mini" placeholder="Asset"></el-autocomplete>
</template>

<script lang="ts">
  // eslint-disable-next-line no-unused-vars
    import {StateSummaryDTO} from '../models';
    import {Autocomplete} from 'element-ui';
    import Vue from 'vue';

    interface MyOpt {
        value: string
        label: string
    }

    export default Vue.extend({
        name: 'AssetId',
        components: {'el-autocomplete': Autocomplete},
        props: {value: String},
        computed: {
            options(): MyOpt[] {
                const summary: StateSummaryDTO = this.$store.state.summary;
                return summary.ccys.map(ccy => {
                    return {value: ccy, label: ccy};
                });
            }
        },
        methods: {
            onSelectChanged(ev: string) {
                this.$emit('input', ev.toUpperCase());
            },
            assetSearch(queryString: string|undefined, cb: any) {
                let cfgs = this.options;
                if (queryString) {
                    cfgs = cfgs.filter(x => x.value.indexOf(queryString.toUpperCase()) > -1);
                }
                const elems = cfgs.map(cfg => {
                    return {
                        value: cfg.value
                    };
                });
                cb(elems);
            },
        }
    })
</script>

<style scoped>

</style>
