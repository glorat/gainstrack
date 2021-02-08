<template>
  <div>
    <markdown-render page="settings-help.md"></markdown-render>
    <table>
      <tr>
        <th>Asset</th>
        <th>Units</th>
        <th>Pricer</th>
        <th>Price</th>
        <th>Live ticker</th>
        <th>Live proxy</th>
        <th>Tags</th>
        <th>Actions</th>
      </tr>
      <tr v-for="asset in assets" :key="asset.asset" :tag="asset.asset">
        <td>
          {{ asset.asset }}
        </td>
        <td class="num">
          {{ positions[asset.asset].units.number }}
        </td>
        <td>
          {{ pricerLabelFor(asset)}}
        </td>
        <td class="num">
          {{ priceFor(asset)}}
        </td>
        <td>
          <q-select
            use-input
            clearable
            class="asset-ticker"
            v-model="asset.options.ticker"
            v-on:input="assetTouched(asset)"
            :options="tickerOptions"
            @filter="tickerSearch"
            />
        </td>
        <td>
          <q-select
            use-input
            clearable
            class="asset-proxy"
            v-model="asset.options.proxy"
            v-on:input="assetTouched(asset)"
            :options="tickerOptions"
            @filter="tickerSearch"
          />
        </td>
        <td width="250px">
          <q-select v-model="asset.options.tags"
                    v-on:input="assetTouched(asset)"
                    multiple
                    new-value-mode="add-unique"
                    use-chips
                    use-input
                    :options="allTags"
          />
        </td>
        <td class="q-pa-sm q-gutter-xs">
          <q-btn color="warning" size="sm" :disable="!asset.dirty" :icon="matRefresh" round @click="assetReset(asset)"/>
          <q-btn color="primary" size="sm" :disable="!asset.dirty" :icon="matCheck" round @click="assetSave(asset)"/>
        </td>
      </tr>

    </table>
  </div>
</template>

<script lang="ts">
  import axios from 'axios'
  import { flatten, uniq, cloneDeep } from 'lodash'
  import { matCheck, matRefresh } from '@quasar/extras/material-icons'
  import { MarkdownRender } from 'src/lib/loader'
  import Vue from 'vue';
  import {GlobalPricer} from 'src/lib/pricer';
  import {MyState} from 'src/store';
  import {AccountCommandDTO} from 'src/lib/assetdb/models';
  import {mapGetters} from 'vuex';
  import {LocalDate} from '@js-joda/core';
  import {formatNumber} from 'src/lib/utils';
  import {toCommodityGainstrack} from 'src/lib/commandDefaulting';

  export default Vue.extend({
    name: 'AssetsEditor',
    components: {
      MarkdownRender,
    },
    data () {
      return {
        // All commands that are asset commands
        assets: [] as AccountCommandDTO[],
        originalAssets: [] as AccountCommandDTO[],
        positions: [],
        tickerOptions: [] as string[],
        matRefresh,
        matCheck,
      }
    },
    computed: {
      ...mapGetters([
        'baseCcy',
      ]),
      globalPricer (): GlobalPricer {
        return this.$store.getters.fxConverter;
      },
      allTags (): string[] {
        return uniq(flatten(this.assets.map(x => x.options?.tags)))
      },
      allTickers (): string[] {
        const state: MyState = this.$store.state;
        let cfgs = state.quoteConfig;
        return uniq(cfgs.map(cfg => cfg.id)).sort()
      },
    },
    methods: {
      pricerLabelFor(asset: AccountCommandDTO) {
        const pricer = this.globalPricer;
        const model = pricer.modelForAssetId(asset.asset || '');
        return model?.label;
      },
      priceFor(asset: AccountCommandDTO) {
        const pricer = this.globalPricer;
        const today = LocalDate.now();
        const price = pricer.getFX(asset.asset??'', this.baseCcy, today);
        return formatNumber(price);
      },
      assetTouched (asset: AccountCommandDTO) {
        this.$set(asset, 'dirty', true)
      },
      assetReset (asset: AccountCommandDTO) {
        const orig = this.originalAssets.find(x => x.asset === asset.asset)
        const idx = this.assets.indexOf(asset)
        Object.assign(this.assets[idx], cloneDeep(orig))
        this.$set(this.assets[idx], 'dirty', false)
      },
      tickerSearch (queryString: string, update: any) {

        update(() => {
          const state: MyState = this.$store.state;
          let cfgs = state.quoteConfig
          if (queryString) {
            cfgs = cfgs.filter(x => x.id.indexOf(queryString.toUpperCase()) > -1)
          }
          const elems = cfgs.map(cfg => cfg.id);
          this.tickerOptions = elems;
        });
      },
      toGainstrack (asset: AccountCommandDTO) {
        return toCommodityGainstrack(asset)
      },
      assetSave (asset: AccountCommandDTO) {
        const str = this.toGainstrack(asset)
        axios.post('/api/post/asset', { str })
          .then(response => {
            this.$notify.success(response.data)
            const orig = this.originalAssets.find(x => x.asset === asset.asset)
            if (orig === undefined) throw new Error('Invariant violation in assetSave')
            const idx = this.originalAssets.indexOf(orig)
            Object.assign(this.originalAssets[idx], cloneDeep(asset))
            this.$set(asset, 'dirty', false)
          })
          .catch(error => this.$notify.error(error.response.data))
      },
      async reloadAll (): Promise<void> {
        await axios.post('/api/assets')
          .then(response => {
            this.originalAssets = response.data.commands // TODO:Get from vuex
            this.positions = response.data.positions
          })
          .catch(error => this.$notify.error(error))
      },
    },
    async mounted () {
      await this.reloadAll()
      this.assets = cloneDeep(this.originalAssets)
    },
  })
</script>

<style scoped>
  .el-select {
    display: block;
  }
</style>
