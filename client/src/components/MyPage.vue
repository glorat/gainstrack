<template>
    <q-page :padding="padding" :style-fn="styleFn" >
        <slot></slot>
    </q-page>
</template>

<script setup lang="ts">
defineProps<{ padding?: boolean }>();

function styleFn(offset: number) {
    const fixup = 40;
    return { minHeight: offset ? `calc(100vh - ${offset + fixup}px)` : '100vh' };
}
</script>

<style scoped>

</style>
