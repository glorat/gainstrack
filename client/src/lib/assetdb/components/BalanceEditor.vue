<template>
<!--  font-style: italic; -->
    <div class="row items-start">
      <q-input :input-class="amountClass" :label="label || 'Amount'" @focus="$event.target.select && $event.target.select()" type="number" v-model="v.number" @update:modelValue="onChanged($event)" clearable></q-input>
      <asset-id :input-class="ccyClass" v-model="v.ccy" @update:modelValue="onCcyChanged()"></asset-id>
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
      data() {
        return {v: {...this.value}}
      },
        methods: {
          onCcyChanged() {
            this.$emit('ccyChanged', this.v.ccy);
            this.onChanged();
          },
            onChanged() {
                this.$emit('update:modelValue', this.v);
            }
        },
      computed: {
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
