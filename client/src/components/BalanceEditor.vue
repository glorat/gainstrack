<template>
    <span>
        <input type="text" v-model="value.number" v-on:input="onChanged()">
        <input type="text" v-model="value.ccy" v-on:input="onChanged()">
    </span>
</template>

<script>
    export default {
        name: 'BalanceEditor',
        props: {value: Object},
        methods: {
            onChanged() {
                this.$emit('input', this.value);
            }
        }
    }
</script>

<style scoped>

</style>
