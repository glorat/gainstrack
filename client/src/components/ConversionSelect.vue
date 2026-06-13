<template>
    <select name="conversion" id="conversion" v-model="value" v-on:change="conversionChange">
        <!--<option value="at_cost">At Cost</option>
        <option value="at_value">At Market Value</option>-->
        <option value="global">Base Currency</option>
        <option value="parent">Account Ccy</option>
        <option value="units">Units</option>
        <option value="GBP">Converted to GBP</option>
        <option value="USD">Converted to USD</option>
    </select>
</template>

<script>
    import {useAppStore} from 'src/stores';

    export default {
        name: 'ConversionSelect',
        setup() { return { store: useAppStore() } },
        data() {
            return {value: this.store.conversion}
        },
        methods: {
            async conversionChange(e) {
                await this.store.setConversion(e.target.value);
                this.value = this.store.conversion;
            },
        },
    }
</script>

<style scoped>

</style>
