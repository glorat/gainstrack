<template>
  <div class="q-pa-md">
    <q-stepper
      v-model="step"
      vertical
      color="primary"
      animated
      header-nav
    >
      <q-step
        :name="1"
        title="Select Assets"
        :done="step > 1"
      >
        <template v-if="assets.rows.length>2">
          <div>
            Select your assets...
            <q-chip
              v-for="a in remainingAssets" :key="a" :label="a" color="primary" text-color="white" clickable
              @click="assetsToBalance.push(a)"
            >
            </q-chip>
          </div>
          <div>
            Chosen:
            <q-chip
              v-for="a in assetsToBalance" :key="a" :label="a" color="primary" text-color="white" clickable
              @click="assetsToBalance = assetsToBalance.filter(asset => asset!==a)"
            ></q-chip>
          </div>
        </template>
        <template v-else>
          Your investment portfolio needs to have at least 2-assets to perform balancing
        </template>
        <q-stepper-navigation>
          <q-btn @click="refresh" color="secondary" label="Reset"/>
          <q-btn @click="selectAssets" color="primary" label="Continue" :disable="assetsToBalance.length<2"/>
        </q-stepper-navigation>
      </q-step>

      <q-step
        :name="2"
        title="Target Allocations"
        :done="step > 2"
      >
        <contribution-calculator-input-editor
          :entries="entries"
          v-model:contribution="contribution"
        ></contribution-calculator-input-editor>
        <q-stepper-navigation>
          <q-btn @click="calculate" color="primary" label="Continue" :disable="!canCalculate"/>
        </q-stepper-navigation>
      </q-step>

      <q-step
        :name="3"
        title="Result"
        :done="step > 3"
      >
        <vue-plotly :data="sankey"></vue-plotly>
        <contribution-calculator-result-view :data="results" :base-ccy="baseCcy"></contribution-calculator-result-view>
      </q-step>
    </q-stepper>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import {AccountDTO, Amount, AssetResponse, NetworthByAsset} from '../lib/assetdb/models';
import {apiAssetsReport} from 'src/lib/apiFacade';
import {difference, includes, sum, sortBy} from 'lodash';
import {formatPerc} from 'src/lib/utils';
import {VuePlotly} from '../lib/loader';
import {useAppStore} from 'src/stores';
import {
  ContributionCalculator,
  ContributionCalculatorEntries,
  ContributionCalculatorInput
} from 'src/lib/ContributionCalculator';
import ContributionCalculatorResultView from 'components/ContributionCalculatorResultView.vue';
import ContributionCalculatorInputEditor from 'components/ContributionCalculatorInputEditor.vue';
import {qnotify} from 'src/boot/notify';

function trim(num: number | undefined): number {
  if (num === undefined) return 0;
  return Math.round((num + Number.EPSILON) * 10) / 10;
}

const props = defineProps<{ accountId?: string }>();

const store = useAppStore();

const step = ref(1);
const assets = ref<AssetResponse>({rows: [], columns: [], totals: []});
const assetsToBalance = ref<string[]>([]);
const entries = ref<ContributionCalculatorInput[]>([]);
const results = ref<ContributionCalculatorEntries[]>([]);
const contribution = ref<Amount>({number: 0, ccy: ''});
const sankey = ref<unknown[]>([]);

async function refresh(refreshProps?: Record<string, any>): Promise<void> {
  const acct: AccountDTO | undefined = store.findAccount(props.accountId ?? '');
  try {
    assets.value = await apiAssetsReport(store, refreshProps ?? props);
    assetsToBalance.value = [];
    contribution.value = {number: 0, ccy: acct?.ccy ?? 'USD'};
  } catch (error) {
    const e: any = error;
    console.error(error);
    qnotify.error(e.toString());
  }
}

function selectAssets(): void {
  const total = sum(rowsToBalance.value.map(row => row.value));
  entries.value = sortBy(rowsToBalance.value.map(row => ({
    ...row, target: trim(100 * row.value / total)
  })), row => -row.value);
  step.value = 2;
}

function calculate(): void {
  const calc = new ContributionCalculator(entries.value, contribution.value.ccy);
  calc.contribute(contribution.value.number);
  results.value = calc.entries;
  step.value = 3;
  sankey.value = [calc.makeSankeyData()];
}

const baseCcy = computed((): string => contribution.value.ccy);
const totalOriginalValue = computed((): number => sum(entries.value.map(e => e.value)));
const totalTargetPerc = computed((): number => sum(entries.value.map(row => row.target || 0)));
const canCalculate = computed((): boolean => totalTargetPerc.value === 100 && contribution.value.number > 0.0);
const remainingAssets = computed((): string[] => difference(assets.value.rows.map(row => row.assetId), assetsToBalance.value));
const rowsToBalance = computed((): NetworthByAsset[] => assets.value.rows.filter(row => includes(assetsToBalance.value, row.assetId)));

onMounted(() => { refresh(); });
</script>

<style scoped>

</style>
