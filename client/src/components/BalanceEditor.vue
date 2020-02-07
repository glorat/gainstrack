<template>
    <span>
        <el-input type="number" v-model="value.number" step="0.01" v-on:input="onChanged()" size="mini"></el-input>
        <asset-id v-model="value.ccy" v-on:input="onChanged()"></asset-id>
    </span>
</template>

<script>
    import AssetId from './AssetId';
    import {Input} from 'element-ui';
    export default {
        name: 'BalanceEditor',
        components: {
            AssetId,
            'el-input': Input,
        },
        props: {value: Object},
        methods: {
            onChanged($event) {
                this.$emit('input', this.value);
            }
        }
    }
</script>

<style scoped>

</style>
