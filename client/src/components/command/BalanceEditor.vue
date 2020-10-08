<template>
    <div class="row items-start">
      <q-input :label="label || 'Amount'" @focus="$event.target.select()" type="number" v-model.number="value.number" v-on:input="onChanged()"></q-input>
      <asset-id v-model="value.ccy" v-on:input="onCcyChanged()"></asset-id>
    </div>
</template>

<script lang="ts">
    import Vue from 'vue';
    import AssetId from '../AssetId.vue';
    export default Vue.extend({
        name: 'BalanceEditor',
        components: {
            AssetId
        },
        props: {value: Object, label: String},
        methods: {
          onCcyChanged() {
            this.$emit('ccyChanged', this.value.ccy);
            this.onChanged();
          },
            onChanged() {
                this.$emit('input', this.value);
            }
        }
    })
</script>

<style scoped>

</style>
