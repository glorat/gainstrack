<template>
  <div>
    <markdown-render page="settings-help.md"></markdown-render>
    <table>
      <tr>
        <th>Asset</th>
        <th>Units</th>
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
          <q-select
            use-input
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

<script>
  import axios from 'axios'
  import { flatten, uniq, cloneDeep } from 'lodash'
  import { matCheck, matRefresh } from '@quasar/extras/material-icons'
  import { MarkdownRender } from 'src/lib/loader'

  export default {
    name: 'AssetsEditor',
    components: {
      MarkdownRender,
    },
    data () {
      return {
        // All commands that are asset commands
        assets: [],
        originalAssets: [],
        positions: [],
        tickerOptions: [],
        matRefresh,
        matCheck,
      }
    },
    computed: {
      allTags () {
        return uniq(flatten(this.assets.map(x => x.options.tags)))
      },
      allTickers () {
        const state = this.$store.state;
        let cfgs = state.quoteConfig;
        return uniq(cfgs.map(cfg => cfg.avSymbol)).sort()
      },
    },
    methods: {
      assetTouched (asset) {
        this.$set(asset, 'dirty', true)
      },
      assetReset (asset) {
        const orig = this.originalAssets.find(x => x.asset === asset.asset)
        const idx = this.assets.indexOf(asset)
        Object.assign(this.assets[idx], cloneDeep(orig))
        this.$set(this.assets[idx], 'dirty', false)
      },
      tickerSearch (queryString, update) {

        update(() => {
          const state = this.$store.state;
          let cfgs = state.quoteConfig
          if (queryString) {
            cfgs = cfgs.filter(x => x.avSymbol.indexOf(queryString.toUpperCase()) > -1)
          }
          const elems = cfgs.map(cfg => cfg.avSymbol);
          this.tickerOptions = elems;
        });
      },
      toGainstrack (asset) {
        let str = `1900-01-01 commodity ${asset.asset}`
        for (const [key, value] of Object.entries(asset.options)) {
          if (key === 'tags' && value.length > 0) {
            str += `\n tags: ${value.join(',')}`
          } else if (value !== '') {
            str += `\n  ${key}: ${value}`
          }
        }
        return str
      },
      assetSave (asset) {
        const str = this.toGainstrack(asset)
        axios.post('/api/post/asset', { str })
          .then(response => {
            this.$notify.success(response.data)
            const orig = this.originalAssets.find(x => x.asset === asset.asset)
            const idx = this.originalAssets.indexOf(orig)
            Object.assign(this.originalAssets[idx], cloneDeep(asset))
            this.$set(asset, 'dirty', false)
          })
          .catch(error => this.$notify.error(error.response.data))
      },
      async reloadAll () {
        return axios.get('/api/assets')
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
  }
</script>

<style scoped>
  .el-select {
    display: block;
  }
</style>
