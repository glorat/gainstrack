<template>
  <div>
    Target
    <div v-for="row in entries" :key="row.assetId" class="row">
      <div class="col-2">
        <q-field stack-label readonly>
          <template v-slot:control>
            <div class="self-center full-width no-outline" tabindex="0">{{ row.assetId }}</div>
          </template>
        </q-field>
      </div>
      <div class="col-2">
        <q-field stack-label>
          <template v-slot:control>
            <div class="self-center full-width no-outline" tabindex="0">{{
                formatPerc(row.value / totalOriginalValue)
              }}
            </div>
          </template>
        </q-field>
      </div>
      <div class="col-2">
        <q-input label="Target" suffix="%" type="number" v-model.number="row.target">
        </q-input>
      </div>
    </div>
    <div class="row">
      <div class="col-12">
        <balance-editor v-model="contribution" label="Contribution"></balance-editor>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from '@vue/composition-api';
import {ContributionCalculatorInput} from '../lib/ContributionCalculator';
import BalanceEditor from 'components/command/BalanceEditor.vue';
import {formatPerc} from 'src/lib/utils';
import {sum} from 'lodash';
import {Amount} from 'src/lib/models';

export default defineComponent({
  name: 'ContributionCalculatorInputEditor',
  components: {
    BalanceEditor
  },
  props: {
    entries: Array as ContributionCalculatorInput[],
    contribution: Object as Amount,
  },
  data() {
    return {
      formatPerc
    }
  },
  computed: {
    totalOriginalValue(): number {
      return sum(this.entries.map(e => e.value))
    },
    totalTargetPerc():number {
      return sum(this.entries.map(row => row.target || 0))
    },
  }
})
</script>

<style scoped>

</style>
