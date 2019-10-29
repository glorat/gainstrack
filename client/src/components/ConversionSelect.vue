<template>
    <select name="conversion" id="conversion" v-model="value" v-on:change="conversionChange">
        <!--<option value="at_cost">At Cost</option>
        <option value="at_value">At Market Value</option>-->
        <option value="parent">Account Ccy</option>
        <option value="units">Units</option>
        <option value="GBP">Converted to GBP</option>
        <option value="USD">Converted to USD</option>
    </select>
</template>

<script>
    export default {
        name: 'ConversionSelect',
        data () {
            return {value: this.$store.state.summary.conversion}
        },
        methods: {
            async conversionChange(e) {
                await this.$store.dispatch('conversion', e.target.value);
                this.value = this.$store.state.summary.conversion;
            },
        },
    }
</script>

<style scoped>

</style>
