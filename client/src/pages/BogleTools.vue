<template>
  <q-page padding class="q-pa-md row items-start q-gutter-md">
    <q-card v-for="tool in tools" :key="tool.target" @click="onClick(tool)" class="my-card">
      <q-card-section horizontal class="items-center" style="min-height: 100px">
        <q-card-section class="col-3">
          <q-icon size="xl" :name="tool.icon"></q-icon>
        </q-card-section>
        <q-card-section class="col-9">
          <div class="text-h6">{{ tool.title }}</div>
          <div class="text-subtitle1" v-if="tool.subtitle">{{ tool.subtitle }}</div>
        </q-card-section>
      </q-card-section>

      <q-separator></q-separator>


      <q-card-section>
        {{ tool.description }}
      </q-card-section>
    </q-card>


  </q-page>
</template>

<script lang="ts">
  import {defineComponent} from '@vue/composition-api';
  import {mdiAlert} from '@quasar/extras/mdi-v5';

  interface Tool {
    target: string
    title: string
    subtitle?: string
    description: string
    icon: string
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
        {target: 'play', title: 'Two Fund Portfolio Guide',
          description: 'Giving you options on implementing an international flavour of the Boglehead inspired "two fund portfolio"',
          icon: 'img:icons/boglebot.svg'
        },
        {target: 'forecast', title: 'Retirement Target Calculator',
          description: 'In 30 seconds, calculate the year by which you can retire',
          icon: 'img:icons/boglebot.svg'
        },

        {target: 'investments', title: 'Portfolio Tools', subtitle: 'Under development!',
          description: 'Tools for helping you manage your portfolio of investments',
          icon: mdiAlert
        },
        {target: 'assetdb', title: 'Investment DB', subtitle: 'Under development!',
          description: 'Crowd-sourced database of ETFs and other investment assets',
          icon: mdiAlert
        }
      ];
      return {tools};
    }
  })
</script>

<style lang="sass" scoped>
.my-card
  width: 100%
  max-width: 300px
  min-height: 200px
  cursor: pointer
</style>
