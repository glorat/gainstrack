<template>
    <button type="button" :title="`Toggle ${name} entries`" :class="{inactive : offState[name]}" @click="onClick">{{ name }}</button>
</template>

<script setup lang="ts">
const props = defineProps<{
  name: string
  offState: Record<string, boolean>
}>();

function onClick() {
    props.offState[props.name] = !props.offState[props.name];
}
</script>

<style scoped>

</style>
