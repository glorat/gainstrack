<template>
  <my-page padding>
    <account-journal :accountId="accountId"></account-journal>
  </my-page>
</template>

<script setup lang="ts">
import AccountJournal from '../components/AccountJournal.vue';

defineProps<{ accountId: string }>();
</script>

<style scoped>

</style>
