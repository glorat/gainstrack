<template>
<!--  font-style: italic; -->
    <div class="row items-start">
      <q-input :input-class="amountClass" :label="label || 'Amount'" @focus="$event.target.select && $event.target.select()" type="number" v-model.number="v.number" v-on:input="onChanged($event)" clearable></q-input>
      <asset-id :input-class="ccyClass" v-model="v.ccy" v-on:input="onCcyChanged()"></asset-id>
    </div>
</template>

<script lang="ts">
    import {defineComponent} from 'vue';
    import AssetId from './AssetId.vue';
    import {AmountEditing} from 'src/lib/assetdb/models';
    export default defineComponent({
        name: 'BalanceEditor',
        components: {
            AssetId
        },
        props: {
          value: {
            type: Object as () => AmountEditing,
            default: () => {return {number:undefined, ccy: undefined} as AmountEditing}
          },
          label: String,
          original: Object as () => AmountEditing|undefined},
      // data() {
      //   return {v: {...this.value}}
      // },
        methods: {
          onCcyChanged() {
            this.$emit('ccyChanged', this.v.ccy);
            this.onChanged();
          },
            onChanged() {
                this.$emit('input', this.v);
            }
        },
      computed: {
        v():AmountEditing {
          return this.value;
        },
        amountClass(): any {
          const defaulted = this.original && (this.v.number !== this.original.number);
          return {'defaulted-input': defaulted}
        },
        ccyClass(): any {
          const defaulted = this.original && (this.v.ccy !== this.original.ccy);
          return {'defaulted-input': defaulted}
        },
      }
    })
</script>

<style scoped>

</style>
