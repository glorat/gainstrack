<template>
    <button type="button" :title="`Toggle ${name} entries`" :class="{inactive: modelValue}" @click="emit('update:modelValue', !modelValue)">{{ name }}</button>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  modelValue: boolean
}>();

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<style scoped>

</style>
