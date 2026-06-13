<template>
  <div>
    <markdown-render page="settings-help.md"></markdown-render>
    <table>
      <thead>
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
      </thead>
      <tbody>
      <tr v-for="asset in assets" :key="asset.asset" :tag="asset.asset">
        <td>
          {{ asset.asset }}
        </td>
        <td class="num">
          {{ formatNumber(positions[asset.asset].units.number) }}
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
            @update:modelValue="assetTouched(asset)"
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
            @update:modelValue="assetTouched(asset)"
            :options="tickerOptions"
            @filter="tickerSearch"
          />
        </td>
        <td width="250px">
          <q-select v-model="asset.options.tags"
                    @update:modelValue="assetTouched(asset)"
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
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
  import axios from 'axios'
  import { flatten, uniq, cloneDeep } from 'lodash'
  import { matCheck, matRefresh } from '@quasar/extras/material-icons'
  import { MarkdownRender } from 'src/lib/loader'
  import {defineComponent} from 'vue';
  import {GlobalPricer} from 'src/lib/pricer';
  import {AccountCommandDTO} from 'src/lib/assetdb/models';
  import {mapState} from 'pinia';
  import {useAppStore} from 'src/stores';
  import {LocalDate} from '@js-joda/core';
  import {formatNumber} from 'src/lib/utils';
  import {toCommodityGainstrack} from 'src/lib/commandDefaulting';

  export default defineComponent({
    name: 'AssetsEditor',
    components: {
      MarkdownRender,
    },
    setup() { return { store: useAppStore() } },
    data () {
      return {
        // All commands that are asset commands
        assets: [] as AccountCommandDTO[],
        originalAssets: [] as AccountCommandDTO[],
        positions: [],
        tickerOptions: [] as string[],
        matRefresh,
        matCheck,
        formatNumber,
      }
    },
    computed: {
      ...mapState(useAppStore, [
        'baseCcy',
        'fxConverter',
        'quoteConfig',
      ]),
      globalPricer (): GlobalPricer {
        return this.fxConverter as GlobalPricer;
      },
      allTags (): string[] {
        return uniq(flatten(this.assets.map(x => x.options?.tags)))
      },
      allTickers (): string[] {
        return uniq(this.quoteConfig.map((cfg: any) => cfg.id)).sort()
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
        const a = asset as any;
        a['dirty'] = true
      },
      assetReset (asset: AccountCommandDTO) {
        const orig = this.originalAssets.find(x => x.asset === asset.asset)
        const idx = this.assets.indexOf(asset)
        Object.assign(this.assets[idx], cloneDeep(orig))
        const a:any = this.assets[idx]
        a['dirty'] = false
      },
      tickerSearch (queryString: string, update: any) {
        update(() => {
          let cfgs = this.quoteConfig
          if (queryString) {
            cfgs = cfgs.filter((x: any) => x.id.indexOf(queryString.toUpperCase()) > -1)
          }
          this.tickerOptions = cfgs.map((cfg: any) => cfg.id);
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
            const a:any = asset;
            a['dirty'] = false
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
