<template>
    <span>
        <el-input type="number" v-model="value.number" step="0.01" v-on:input="onChanged()" size="mini"></el-input>
        <asset-id v-model="value.ccy" v-on:input="onChanged()"></asset-id>
    </span>
</template>

<script lang="ts">
    import Vue from 'vue';
    import AssetId from '../AssetId.vue';
    import {Input} from 'element-ui';
    export default Vue.extend({
        name: 'BalanceEditor',
        components: {
            AssetId,
            'el-input': Input,
        },
        props: {value: Object},
        methods: {
            onChanged($event: object) {
                this.$emit('input', this.value);
            }
        }
    })
</script>

<style scoped>

</style>
