<template>
  <q-select :modelValue="selectValue" @update:modelValue="onInput" :label="label"
            :options="displayOptions"
            multiple use-chips
            use-input @filter="filterFn"
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
import {EnumEntry, simpleEnumEntry} from 'src/lib/assetdb/enums';

const props = defineProps<{
  modelValue?: Record<string, boolean>
  options?: EnumEntry[]
  label?: string
  clearable?: boolean
  dense?: boolean
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, boolean>]
  'clear': []
}>();

const displayOptions = ref<EnumEntry[]>(props.options ?? []);

function filterFn(val: string, update: (fn: () => void) => void) {
  update(() => {
    const needle = val.toLowerCase();
    displayOptions.value = props.options?.filter(v => v.value.toLowerCase().indexOf(needle) > -1) ?? [];
  });
}

function onInput(vals: EnumEntry[]): void {
  const ret: Record<string, boolean> = {};
  vals.forEach(val => {
    ret[val.value] = true;
  });
  emit('update:modelValue', ret);
}

const selectValue = computed((): EnumEntry[] => {
  const modelValue = props.modelValue ?? {};
  return Object.keys(modelValue)
    .filter(k => modelValue[k])
    .map(key => props.options?.find(o => o.value === key) ?? simpleEnumEntry(key));
});
</script>

<style scoped>

</style>
