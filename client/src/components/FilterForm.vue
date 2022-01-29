<template>
  <command-date-editor @update:modelValue="onDateChange" :modelValue="dateOverride"></command-date-editor>
</template>

<script lang="ts">

  import {defineComponent} from 'vue';
  import CommandDateEditor from './CommandDateEditor.vue'

  export default defineComponent({
    name: 'FilterForm',
    components: {CommandDateEditor},
    computed: {
      dateOverride():string {
        return this.$store.state.dateOverride?.toString() ?? '';
      }
    },
    methods: {
      onDateChange(e:string) {
        this.$store.dispatch('dateOverride', e);
      },
    }
  })
</script>

<style scoped>

</style>
