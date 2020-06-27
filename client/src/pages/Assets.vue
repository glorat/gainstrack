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
  import {AssetResponse} from '../models';

  export default Vue.extend({
    name: 'Assets',
    components: {AssetView},
    data() {
      return {
        assetResponse: {rows: [], columns: [], totals: []} as AssetResponse,
        loading: true
      };
    },
    methods: {
      reloadAll(): Promise<void> {
        return axios.get('/api/assets/networth')
          .then(response => {
            const assetResponse: AssetResponse = response.data;
            this.assetResponse = assetResponse;
          })
          .catch(error => {
            this.$notify.error(error);
          })
          .finally(() => {
            this.loading = false;
          });
      }
    },
    mounted() {
      this.reloadAll();
    }
  });
</script>

<style scoped>

</style>
