<template>
  <command-date-editor @update:modelValue="onDateChange" :modelValue="dateOverride"></command-date-editor>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import CommandDateEditor from './CommandDateEditor.vue';
import {useAppStore} from 'src/stores';

const store = useAppStore();

const dateOverride = computed((): string => store.dateOverride?.toString() ?? '');

function onDateChange(e: string) {
  store.setDateOverride(e);
}
</script>

<style scoped>

</style>
