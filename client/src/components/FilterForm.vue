<template>
  <command-date-editor @update:modelValue="onDateChange" :modelValue="dateOverride"></command-date-editor>
</template>

<script lang="ts">

  import {defineComponent} from 'vue';
  import CommandDateEditor from './CommandDateEditor.vue'
  import {useAppStore} from 'src/stores';

  export default defineComponent({
    name: 'FilterForm',
    components: {CommandDateEditor},
    setup() { return { store: useAppStore() } },
    computed: {
      dateOverride():string {
        return this.store.dateOverride?.toString() ?? '';
      }
    },
    methods: {
      onDateChange(e:string) {
        this.store.setDateOverride(e);
      },
    }
  })
</script>

<style scoped>

</style>
