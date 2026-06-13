<template>
    <select name="conversion" id="conversion" :value="store.conversion" v-on:change="conversionChange">
        <!--<option value="at_cost">At Cost</option>
        <option value="at_value">At Market Value</option>-->
        <option value="global">Base Currency</option>
        <option value="parent">Account Ccy</option>
        <option value="units">Units</option>
        <option value="GBP">Converted to GBP</option>
        <option value="USD">Converted to USD</option>
    </select>
</template>

<script setup lang="ts">
import { useAppStore } from 'src/stores'

const store = useAppStore()

async function conversionChange(e: Event) {
  await store.setConversion((e.target as HTMLSelectElement).value)
}
</script>

<style scoped>

</style>
