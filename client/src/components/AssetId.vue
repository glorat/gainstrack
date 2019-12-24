<template>
    <input type="text" :value="ccy" size="10" v-on:input="onChanged($event)">
</template>

<script>
    export default {
        name: 'AssetId',
        props: {'ccy': String},
        methods: {
            onChanged(ev) {
                this.$emit('input', ev.target.value);
            }
        }
    }
</script>

<style scoped>

</style>