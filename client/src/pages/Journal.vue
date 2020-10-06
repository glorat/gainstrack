<template>
  <my-page padding>
    <h5>Journal</h5>
    <p>Shows all your transactions you have made. Change column shows the impact to your networth as at the time the
      transaction occurred</p>
    <journal-table :entries="info.rows" show-balance></journal-table>
  </my-page>
</template>

<script lang="ts">
  // import axios from 'axios'
  import JournalTable from '../components/JournalTable.vue'
  import {AccountTxDTO, journalEntries} from 'src/lib/utils'
  import { mapGetters } from 'vuex'
  import Vue from 'vue';
  import { MyState } from 'src/store';
  import {SingleFXConverter} from 'src/lib/fx';

  export default Vue.extend({
    name: 'Journal',
    components: { JournalTable },
    props: ['accountId'],
    data () {
      return {
        info: { rows: [] as AccountTxDTO[] },
      }
    },
    computed: {
      ...mapGetters(['fxConverter', 'allTxs'])
    },
    mounted () {
      const state: MyState = this.$store.state;
      const fxConverter: SingleFXConverter = this.fxConverter
      const txs = this.allTxs.reverse();
      const cmds = state.allState.commands;
      const baseCcy = state.allState.baseCcy;

      this.info = {rows: journalEntries(fxConverter, txs, cmds, baseCcy)}
    },
  })
</script>

<style>

</style>
