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
          {{ formatNumber(positions[asset.asset ?? '']?.units?.number) }}
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

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import axios from 'axios';
import {flatten, uniq, cloneDeep} from 'lodash';
import {matCheck, matRefresh} from '@quasar/extras/material-icons';
import {MarkdownRender} from 'src/lib/loader';
import {GlobalPricer} from 'src/lib/pricer';
import {AccountCommandDTO} from 'src/lib/assetdb/models';
import {useAppStore} from 'src/stores';
import {LocalDate} from '@js-joda/core';
import {formatNumber} from 'src/lib/utils';
import {toCommodityGainstrack} from 'src/lib/commandDefaulting';
import {qnotify} from 'src/boot/notify';

type AssetRecord = Omit<AccountCommandDTO, 'options'> & {
  options: Record<string, any>
  dirty?: boolean
}

const store = useAppStore();

const assets = ref<AssetRecord[]>([]);
const originalAssets = ref<AccountCommandDTO[]>([]);
const positions = ref<Record<string, any>>({});
const tickerOptions = ref<string[]>([]);

const globalPricer = computed((): GlobalPricer => store.fxConverter as GlobalPricer);
const allTags = computed((): string[] => uniq(flatten(assets.value.map(x => x.options?.tags))));

function pricerLabelFor(asset: AccountCommandDTO) {
  const model = globalPricer.value.modelForAssetId(asset.asset || '');
  return model?.label;
}

function priceFor(asset: AccountCommandDTO) {
  const today = LocalDate.now();
  const price = globalPricer.value.getFX(asset.asset ?? '', store.baseCcy, today);
  return formatNumber(price);
}

function assetTouched(asset: AssetRecord) {
  asset.dirty = true;
}

function assetReset(asset: AssetRecord) {
  const orig = originalAssets.value.find(x => x.asset === asset.asset);
  const idx = assets.value.indexOf(asset);
  Object.assign(assets.value[idx], cloneDeep(orig));
  assets.value[idx].dirty = false;
}

function tickerSearch(queryString: string, update: any) {
  update(() => {
    let cfgs = store.quoteConfig;
    if (queryString) {
      cfgs = cfgs.filter((x: any) => x.id.indexOf(queryString.toUpperCase()) > -1);
    }
    tickerOptions.value = cfgs.map((cfg: any) => cfg.id);
  });
}

function toGainstrack(asset: AssetRecord) {
  return toCommodityGainstrack(asset);
}

function assetSave(asset: AssetRecord) {
  const str = toGainstrack(asset);
  axios.post('/api/post/asset', {str})
    .then(response => {
      qnotify.success(response.data);
      const orig = originalAssets.value.find(x => x.asset === asset.asset);
      if (orig === undefined) throw new Error('Invariant violation in assetSave');
      const idx = originalAssets.value.indexOf(orig);
      Object.assign(originalAssets.value[idx], cloneDeep(asset));
      asset.dirty = false;
    })
    .catch(error => qnotify.error(error.response.data));
}

async function reloadAll(): Promise<void> {
  await axios.post('/api/assets')
    .then(response => {
      originalAssets.value = response.data.commands;
      positions.value = response.data.positions;
    })
    .catch(error => qnotify.error(error));
}

onMounted(async () => {
  await reloadAll();
  assets.value = cloneDeep(originalAssets.value) as AssetRecord[];
});
</script>

<style scoped>
  .el-select {
    display: block;
  }
</style>
