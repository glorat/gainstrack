<template>
<!--  font-style: italic; -->
    <div class="row items-start">
      <q-input :input-class="amountClass" :label="label || 'Amount'" @focus="$event.target.select && $event.target.select()" type="number" :model-value="modelValue.number" @update:modelValue="onChanged($event)" clearable></q-input>
      <asset-id :input-class="ccyClass" :model-value="modelValue.ccy" @update:modelValue="onCcyChanged($event)"></asset-id>
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
          modelValue: {
            type: Object as () => AmountEditing,
            default: () => {return {number:undefined, ccy: undefined} as AmountEditing}
          },
          label: String,
          original: Object as () => AmountEditing|undefined
        },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      emits: {'update:modelValue': (payload: AmountEditing) => true},
        methods: {
          onCcyChanged(ev:any) {
            const ret = {...this.modelValue, ccy:ev};
            this.$emit('update:modelValue', ret);
            // this.$emit('ccyChanged', this.v.ccy);
            // this.onChanged();
          },
            onChanged(ev:any) {
              const ret = {...this.modelValue, number: parseFloat(ev)};
              this.$emit('update:modelValue', ret);
            }
        },
      computed: {
        amountClass(): any {
          const defaulted = this.original && (this.modelValue.number !== this.original.number);
          return {'defaulted-input': defaulted}
        },
        ccyClass(): any {
          const defaulted = this.original && (this.modelValue.ccy !== this.original.ccy);
          return {'defaulted-input': defaulted}
        },
      }
    })
</script>

<style scoped>

</style>
