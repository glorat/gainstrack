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
          :contribution="contribution"
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
        <contribution-calculator-result-view :data="results" :base-ccy="baseCcy"></contribution-calculator-result-view>
      </q-step>
    </q-stepper>
  </div>
</template>

<script lang="ts">
import {defineComponent} from '@vue/composition-api';
import {AccountDTO, Amount, AssetResponse, NetworthByAsset} from '../lib/models';
import {apiAssetsReport} from 'src/lib/apiFacade';
import {difference, includes, sum, sortBy} from 'lodash';
import {formatPerc} from 'src/lib/utils';
import BalanceEditor from 'components/command/BalanceEditor.vue';
import {mapGetters} from 'vuex';
import {
  ContributionCalculator,
  ContributionCalculatorEntries,
  ContributionCalculatorInput
} from 'src/lib/ContributionCalculator';
import ContributionCalculatorResultView from 'components/ContributionCalculatorResultView.vue';
import ContributionCalculatorInputEditor from 'components/ContributionCalculatorInputEditor.vue';

function trim(num: number | undefined): number {
  if (num === undefined) return 0;
  return Math.round((num + Number.EPSILON) * 10) / 10
}

export default defineComponent({
  name: 'RebalanceCalc',
  props: {
    accountId: String,
  },
  components: {
    BalanceEditor,
    ContributionCalculatorResultView,
    ContributionCalculatorInputEditor,
  },
  data() {
    return {
      step: 1,
      assets: {rows: [], columns: [], totals: []} as AssetResponse,
      assetsToBalance: [],
      entries: [] as ContributionCalculatorInput[],
      results: [] as ContributionCalculatorEntries[],
      contribution: {number: 0, ccy: ''} as Amount,
      formatPerc
    }
  },
  methods: {
    async refresh(props?: Record<string, any>): Promise<void> {

      const acct: AccountDTO | undefined = this.$store.getters.findAccount(this.accountId);
      try {
        this.assets = await apiAssetsReport(this.$store, props ?? this.$props);
        this.assetsToBalance = [];
        this.contribution = {number: 0, ccy: acct?.ccy ?? 'USD'}
      } catch (error) {
        console.error(error)
        this.$notify.error(error)
      }
    },
    selectAssets(): void {
      const total = sum(this.rowsToBalance.map(row => row.value));
      this.entries = sortBy(this.rowsToBalance.map(row => {
        return {...row, target: trim(100 * row.value / total)}
      }), row => -row.value)
      this.step = 2
    },
    calculate(): void {
      const calc = new ContributionCalculator(this.entries, this.contribution.ccy)
      calc.contribute(this.contribution.number)
      this.results = calc.entries
      this.step = 3
    }
  },
  computed: {
    ...mapGetters([
      'findAccount'
    ]),
    baseCcy(): string {
      return this.contribution.ccy
    },
    totalOriginalValue(): number {
      return sum(this.entries.map(e => e.value))
    },
    totalTargetPerc(): number {
      return sum(this.entries.map(row => row.target || 0))
    },
    canCalculate(): boolean {
      return this.totalTargetPerc === 100 && this.contribution.number > 0.0;
    },
    remainingAssets(): string[] {
      const allAssets = this.assets.rows.map(row => row.assetId)
      return difference(allAssets, this.assetsToBalance)
    },
    rowsToBalance(): NetworthByAsset[] {
      return this.assets.rows.filter(row => includes(this.assetsToBalance, row.assetId))
    },
  },
  mounted(): void {
    this.refresh();
  },
})
</script>

<style scoped>

</style>
