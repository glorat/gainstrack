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
        <q-stepper-navigation>
          <q-btn @click="refresh" color="secondary" label="Reset" />
          <q-btn @click="selectAssets" color="primary" label="Continue" />
        </q-stepper-navigation>
      </q-step>

      <q-step
        :name="2"
        title="Target Allocations"
        :done="step > 2"
      >
        Target
        <div v-for="row in entries" :key="row.assetId" class="row">
          <div class="col-2"><q-field stack-label>        <template v-slot:control>
            <div class="self-center full-width no-outline" tabindex="0">{{row.assetId}}</div>
          </template></q-field></div>
          <div class="col-2"><q-field stack-label>        <template v-slot:control>
            <div class="self-center full-width no-outline" tabindex="0">{{ formatPerc(row.value / assets.totals[0].value) }}</div>
          </template></q-field></div>
          <div class="col-2"><q-input label="Target" suffix="%" type="number" v-model.number="row.target">
          </q-input></div>
        </div>
        <div class="row">
          <div class="col-12">
            <balance-editor v-model="contribution" label="Contribution"></balance-editor>
          </div>
        </div>
        <q-stepper-navigation>
          <q-btn @click="step = 3" color="primary" label="Continue" :disable="!canCalculate" />
        </q-stepper-navigation>
      </q-step>
    </q-stepper>
  </div>
</template>

<script lang="ts">
import {defineComponent} from '@vue/composition-api';
import {AccountDTO, Amount, AssetResponse, NetworthByAsset} from '../lib/models';
import {apiAssetsReport} from 'src/lib/apiFacade';
import {difference, includes, sum} from 'lodash';
import {formatPerc} from 'src/lib/utils';
import BalanceEditor from 'components/command/BalanceEditor.vue';
import {mapGetters} from 'vuex';

interface Entries extends NetworthByAsset {
  target?: number
}

function trim(num: number|undefined): number|undefined {
  if (num === undefined) return undefined;
  return Math.round((num + Number.EPSILON) * 10) / 10
}

export default defineComponent({
  name: 'RebalanceCalc',
  props: {
    accountId: String,
  },
  components: {
    BalanceEditor,
  },
  data() {
    return {
      step: 1,
      assets: {rows:[], columns:[], totals:[]} as AssetResponse,
      assetsToBalance: [],
      entries: [] as Entries[],
      contribution: {number: 0, ccy: ''} as Amount,
      formatPerc
    }
  },
  methods: {
    async refresh(props?: Record<string, any>):Promise<void> {

      const acct:AccountDTO|undefined = this.$store.getters.findAccount(this.accountId);
      try {
        this.assets = await apiAssetsReport(this.$store, props ?? this.$props);
        this.assetsToBalance = [];
        this.contribution = {number:0, ccy: acct?.ccy ?? 'USD'}
      } catch (error) {
        console.error(error)
        this.$notify.error(error)
      }
    },
    selectAssets():void {
      const total = this.assets.totals[0].value;

      this.entries = this.rowsToBalance.map(row => {return {...row, target: trim(100*row.value/total)}})
      this.step = 2
    },
  },
  computed: {
    ...mapGetters([
      'findAccount'
    ]),
    remainingAssets():string[] {
      const allAssets = this.assets.rows.map(row => row.assetId)
      return difference(allAssets, this.assetsToBalance)
    },
    rowsToBalance(): NetworthByAsset[] {
      return this.assets.rows.filter(row => includes(this.assetsToBalance, row.assetId))
    },
    totalTargetPerc():number {
      return sum(this.entries.map(row => row.target || 0))
    },
    canCalculate(): boolean {
      return this.totalTargetPerc === 100;
    }
  },
  mounted(): void {
    this.refresh();
  },
})
</script>

<style scoped>

</style>
