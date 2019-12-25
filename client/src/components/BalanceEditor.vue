<template>
    <span>
        <input type="text" v-model="value.number" size="10" v-on:input="onChanged()">
        <asset-id v-model="value.ccy" v-on:input="onChanged()"></asset-id>
    </span>
</template>

<script>
    import AssetId from './AssetId';
    export default {
        name: 'BalanceEditor',
        components: {AssetId},
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
