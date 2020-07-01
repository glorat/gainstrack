<template>
  <command-date-editor @input="onDateChange" :value="dateOverride"></command-date-editor>
</template>

<script lang="ts">

  import Vue from 'vue';
  import CommandDateEditor from './CommandDateEditor.vue'

  export default Vue.extend({
    name: 'FilterForm',
    components: {CommandDateEditor},
    computed: {
      latestDate():string {
        return this.$store.state.allState.latestDate;

      },
      dateOverride():string {
        return this.$store.state.allState.dateOverride;
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
