<template>
  <q-select
    use-input
    clearable
    :modelValue="value"
    @update:modelValue="$emit('update:modelValue', $event)"
    :options="tickerOptions"
    @filter="tickerSearch"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {QuoteSource} from '../assetDb';
import {useAppStore} from 'src/stores';

defineProps<{ value?: string }>();
defineEmits<{ 'update:modelValue': [value: string] }>();

const store = useAppStore();
const tickerOptions = ref<string[]>([]);

function tickerSearch(queryString: string, update: any) {
  update(() => {
    let cfgs: QuoteSource[] = store.quoteConfig;
    if (queryString) {
      cfgs = cfgs.filter(x => x.id.indexOf(queryString.toUpperCase()) > -1);
    }
    tickerOptions.value = cfgs.map(cfg => cfg.id);
  });
}
</script>

<style scoped>

</style>
