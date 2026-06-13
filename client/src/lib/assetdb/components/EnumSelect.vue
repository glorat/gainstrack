<template>
  <q-select :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" :label="label"
            :options="displayOptions" emit-value
            use-input @filter="filterFn"
            :display-value="displayValue"
            :clearable="clearable" :dense="dense"
            @clear="$emit('clear')"
  >
    <template v-slot:option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section>
          <q-item-label>{{ scope.opt.value }}</q-item-label>
          <q-item-label caption>{{ scope.opt.description }}</q-item-label>
        </q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {EnumEntry} from '../enums';

const props = defineProps<{
  modelValue?: string
  options?: EnumEntry[]
  label?: string
  clearable?: boolean
  dense?: boolean
}>();

defineEmits<{
  'update:modelValue': [value: string]
  'clear': []
}>();

const displayOptions = ref<EnumEntry[]>(props.options ?? []);

function filterFn(val: string, update: (fn: () => void) => void) {
  update(() => {
    const needle = val.toLowerCase();
    displayOptions.value = props.options?.filter(v => v.value.toLowerCase().indexOf(needle) > -1) ?? [];
  });
}

const displayValue = computed((): string | undefined => {
  return props.options?.find(x => x.value === props.modelValue)?.label;
});
</script>

<style scoped>

</style>
