<template>
    <el-select
            :value="value"
            v-on:input="onSelectChanged($event)"
            filterable
            allow-create
            default-first-option
            size="mini"
            placeholder="Asset">
        <el-option
                v-for="item in options"
                :key="item.value"
                :label="item.label"
                :value="item.value">
        </el-option>
    </el-select>
</template>

<script>
    import {Select, Option} from 'element-ui';

    export default {
        name: 'AssetId',
        components: {'el-select': Select, 'el-option': Option},
        props: {value: String},
        computed: {
            options() {
                return this.$store.state.summary.ccys.map(ccy => {
                    return {value: ccy, label: ccy};
                });
            }

        },
        methods: {
            onChanged(ev) {
                this.$emit('input', ev.target.value);
            },
            onSelectChanged(ev) {
                this.$emit('input', ev.toUpperCase());
            }
        }
    }
</script>

<style scoped>

</style>