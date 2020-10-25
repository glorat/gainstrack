<template>
  <q-page padding>
    <q-card><q-card-section>Hello</q-card-section></q-card>
    <q-card v-for="tool in tools" :key="tool.target" @click="onClick(tool)" style="cursor: pointer;">
      <q-card-section>{{ tool.title }}</q-card-section>
      <q-card-section>{{ tool.description }}</q-card-section>
    </q-card>
  </q-page>
</template>

<script lang="ts">
  import {defineComponent} from '@vue/composition-api';

  interface Tool {
    target: string,
    title: string
    description: string
  }

  export default defineComponent({
    name: 'BogleTools',
    methods: {
      onClick(tool:Tool) {
        this.$router.push({
          path: tool.target,
          // query: { cmd: cmd.prefix }
        })
      }
    },
    data() {
      const tools: Tool[] = [
        {target: 'play', title: 'Two Fund', description: ''}
      ];
      return {tools};
    }
  })
</script>

<style scoped>

</style>
