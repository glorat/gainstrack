<template>
  <q-select
    :label="label || 'Asset'"
    :modelValue="modelValue"
    @update:modelValue="onSelectChanged"
    use-input
    hide-selected
    fill-input
    input-debounce="0"
    :options="filteredOptions"
    @filter="filterFn"
    :input-class="inputClass"
  ></q-select>
<!--  hint="Asset/Ccy"-->
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {useAppStore} from 'src/stores';

interface MyOpt {
  value: string
  label: string
}

const props = defineProps<{
  modelValue?: string
  label?: string
  inputClass?: string | object | any[]
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const store = useAppStore();

const filteredOptions = ref<MyOpt[]>([]);
const moreOptions = ref<string[]>([]);

const options = computed((): MyOpt[] => {
  const stateCcys: string[] = store.allCcys;
  const ccys: string[] = ['', ...moreOptions.value, ...(stateCcys.length > 0 ? stateCcys : ['USD'])];
  return ccys.map(ccy => ({value: ccy, label: ccy}));
});

function createValue(val: string, done: any) {
  if (val.length > 0) {
    if (!moreOptions.value.includes(val)) {
      moreOptions.value.push(val);
    }
    done(val, 'toggle');
  }
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

function onSelectChanged(ev: any) {
  if (ev.value !== props.modelValue) {
    emit('update:modelValue', ev.value.toUpperCase());
  }
}
</script>

<style scoped>

</style>
