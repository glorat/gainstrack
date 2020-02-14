<template>
    <el-select
            :value="value"
            v-on:input="onSelectChanged($event)"
            filterable
            allow-create
            default-first-option
            size="mini"
            placeholder="">
        <el-option
                v-for="item in options"
                :key="item.value"
                :label="item.label"
                :value="item.value">
        </el-option>
    </el-select>
</template>

<script lang="ts">
    import {Amount, StateSummaryDTO} from '@/models';
    import {Select, Option} from 'element-ui';
    import Vue from 'vue';

    export default Vue.extend({
        name: 'AssetId',
        components: {'el-select': Select, 'el-option': Option},
        props: {value: String},
        computed: {
            options(): object[] {
                const summary: StateSummaryDTO = this.$store.state.summary;
                return summary.ccys.map(ccy => {
                    return {value: ccy, label: ccy};
                });
            }
        },
        methods: {
            onSelectChanged(ev: string) {
                this.$emit('input', ev.toUpperCase());
            }
        }
    })
</script>

<style scoped>

</style>