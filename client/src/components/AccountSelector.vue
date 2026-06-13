<template>
  <q-select
    :modelValue="modelValue"
    @update:modelValue="onQSelectChanged($event)"
    :options="filteredOptions"
    :label="resolvedPlaceholder"
    :input-class="selectClass"
    use-input
    fill-input
    hide-selected
    input-debounce="0"
    @filter="filterFn"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {useAppStore} from 'src/stores';

const props = defineProps<{
  modelValue?: string
  original?: any
  accountList?: string[]
  placeholder?: string
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const store = useAppStore();

const filteredOptions = ref<{value: string, label: string}[]>([]);

const resolvedPlaceholder = computed((): string => props.placeholder || 'Account');
const accounts = computed((): string[] => props.accountList || store.accountIds);
const options = computed(() => accounts.value.map(acctId => ({value: acctId, label: acctId})).sort());

const selectClass = computed(() => {
  const defaulted = props.modelValue !== props.original;
  return {'defaulted-input': defaulted};
});

function onQSelectChanged(ev: { label: string, value: string }) {
  emit('update:modelValue', ev.value);
}

function filterFn(val: string, update: any) {
  update(
    () => {
      const needle = val.toUpperCase();
      filteredOptions.value = options.value.filter(v => v.value.toUpperCase().indexOf(needle) > -1);
    },
    (ref: any) => {
      if (val !== '' && ref.options.length > 0) {
        ref.setOptionIndex(-1);
        ref.moveOptionSelection(1, true);
      }
    }
  );
}
</script>

<style scoped>

</style>
