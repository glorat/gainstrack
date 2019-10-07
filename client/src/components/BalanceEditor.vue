<template>
    <span>
        <input type="text" v-model="value.value" v-on:input="onChanged()">
        <input type="text" v-model="value.ccy" v-on:input="onChanged()">
    </span>
</template>

<script>
    // let x:Balance = new Balance();

    export default {
        name: "BalanceEditor",
        props: {value:Object},
        methods: {
            onChanged() {
                this.$emit('input', this.value);
            }
        }
    }
</script>

<style scoped>

</style>
