<template>
  <my-page padding>
    <account-journal :accountId="accountId"></account-journal>
  </my-page>
</template>

<script lang="ts">
  import AccountJournal from '../components/AccountJournal.vue';

  import {defineComponent} from 'vue';

  export default defineComponent({
    name: 'Command',
    components: {AccountJournal},
    props: ['accountId'],
  });
</script>

<style scoped>

</style>
