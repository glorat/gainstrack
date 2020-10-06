<template>
  <my-page padding>
    <asset-view :asset-response="assetResponse" :loading="loading"></asset-view>
  </my-page>
</template>

<script lang="ts">
  import AssetView from '../components/AssetView.vue';
  import Vue from 'vue';
  import axios from 'axios';
  // eslint-disable-next-line no-unused-vars
  import {AssetResponse, PostingEx} from '../lib/models';
  import {SingleFXConverter} from 'src/lib/fx';
  import {LocalDate} from '@js-joda/core';
  import {assetReport} from 'src/lib/assetReport';
  import {isSubAccountOf, postingsToPositionSet} from 'src/lib/utils';
  import {mapGetters} from 'vuex';

  export default Vue.extend({
    name: 'Assets',
    components: {AssetView},
    data() {
      return {
        assetResponse: {rows: [], columns: [], totals: []} as AssetResponse,
        loading: true
      };
    },
    computed: {
      ...mapGetters([
        'allPostingsEx',
        'fxConverter',
        'baseCcy'
      ])
    },
    methods: {
      async reloadAll(): Promise<void> {
        const localCompute = true;
        try {
          if (localCompute) {
            const allPostings: PostingEx[] = this.allPostingsEx;
            const pricer: SingleFXConverter = this.fxConverter;
            const baseCcy = this.baseCcy;
            const date = LocalDate.now();
            const networthFilter = (p:PostingEx) => isSubAccountOf(p.account, 'Assets')||isSubAccountOf(p.account, 'Liabilities');
            const networthPs = allPostings.filter(networthFilter);
            const pSet = postingsToPositionSet(networthPs);
            const assetResponse = assetReport(pSet, pricer, baseCcy, date);
            this.assetResponse = assetResponse;
          } else {
            const response = await axios.get('/api/assets/networth')
            const assetResponse: AssetResponse = response.data;
            this.assetResponse = assetResponse;
          }
        } catch (error) {
          console.error(error);
          this.$notify.error(error);
        } finally {
          this.loading = false;
        }
      }
    },
    mounted() {
      this.reloadAll();
    }
  });
</script>

<style scoped>

</style>
