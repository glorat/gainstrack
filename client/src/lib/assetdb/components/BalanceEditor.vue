<template>
<!--  font-style: italic; -->
    <div class="row items-start">
      <q-input :input-class="amountClass" :label="label || 'Amount'" @focus="($event.target as HTMLInputElement | null)?.select?.()" type="number" :model-value="modelValue.number" @update:modelValue="onChanged($event)" clearable></q-input>
      <asset-id :input-class="ccyClass" :model-value="modelValue.ccy" @update:modelValue="onCcyChanged($event)"></asset-id>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AssetId from './AssetId.vue';
import {AmountEditing} from 'src/lib/assetdb/models';

const props = withDefaults(defineProps<{
  modelValue?: AmountEditing
  label?: string
  original?: AmountEditing
}>(), {
  modelValue: () => ({number: undefined, ccy: undefined} as AmountEditing)
});

const emit = defineEmits<{ 'update:modelValue': [payload: AmountEditing] }>();

function onCcyChanged(ev: any) {
  emit('update:modelValue', {...(props.modelValue ?? {}), ccy: ev} as AmountEditing);
}

function onChanged(ev: any) {
  emit('update:modelValue', {...(props.modelValue ?? {}), number: parseFloat(ev)} as AmountEditing);
}

const amountClass = computed(() => {
  const defaulted = props.original && (props.modelValue.number !== props.original.number);
  return {'defaulted-input': defaulted};
});

const ccyClass = computed(() => {
  const defaulted = props.original && (props.modelValue.ccy !== props.original.ccy);
  return {'defaulted-input': defaulted};
});
</script>

<style scoped>

</style>
