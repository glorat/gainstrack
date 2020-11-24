<template>
  <q-card>
    <q-card-section class="text-h6">Define Asset</q-card-section>
    <q-card-section>
      <div v-for="schema in schemas" :key="schema.label">
        <q-chip color="primary" text-color="white" :label="schema.label"
                removable
                @remove="onRemove(schema)"
        ></q-chip>
        <span>{{ schema.description }}</span>
        <field-editor
          :schema="schema"
          :model-value="properties[schema.name]"
          @input="onFieldUpdate(schema.name, $event)"
        ></field-editor>
      </div>
    </q-card-section>
    <q-card-section>
      <q-chip v-for="tag in availableTags"
              :key="tag.name" color="primary" text-color="white" :label="tag.label"
              clickable @click="$set(properties, tag.name, undefined)"></q-chip>
    </q-card-section>
    <q-card-actions align="right">
      <q-btn class="c-cancel" color="primary" type="button" v-on:click="cancel" v-close-popup>Cancel</q-btn>
      <q-btn class="c-add" color="primary"
             :disable=" !canAdd"
             @click="addAsset">Add
        <template v-slot:loading>
          <q-spinner v-if="adding" /><q-spinner-grid v-else/>
        </template>
      </q-btn>
    </q-card-actions>
    <q-card-section>
      <div v-if="assetGainstrack"><pre>{{ assetGainstrack }}</pre></div>
      <div v-if="commandGainstrack"><pre>{{ commandGainstrack }}</pre></div>
      <div v-if="assetPrice">Price: <pre>{{ assetPrice }} {{baseCcy}}</pre></div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import {defineComponent} from '@vue/composition-api';
import FieldEditor from './field/FieldEditor.vue';
import {
  AssetProperty,
  availablePropertiesForAsset,
  createAssetFromProps,
  schemaFor, selectedPropertiesForAsset,
} from 'src/lib/AssetSchema';
import {AccountCommandDTO, AssetDTO} from 'src/lib/models';
import {GlobalPricer} from 'src/lib/pricer';
import {LocalDate} from '@js-joda/core';
import {formatNumber} from 'src/lib/utils';
import {defaultedBalanceOrUnit, toGainstrack} from 'src/lib/commandDefaulting';
import {AllStateEx} from 'src/lib/AllStateEx';
import axios from 'axios';


export default defineComponent({
  name: 'NewAssetEditor',
  components: {FieldEditor},
  props: {
    accountId: {
      type: String,
    }
  },
  data() {
    const properties: Record<string, any> = {name: '', category:''};
    const adding = false;
    return {
      properties,
      adding
    }
  },
  methods: {
    onFieldUpdate(field:string, newValue: any) {
      this.$set(this.properties, field, newValue);
      if (newValue && schemaFor(field).schema==='ticker') {
        this.$store.dispatch('loadQuotes', newValue);
      }
    },
    onRemove(propType: AssetProperty) {
      this.$delete(this.properties, propType.name);
    },
    addAsset() {
      const str = this.assetGainstrack;
      if (str) {

        axios.post('/api/post/asset', { str })
          .then(response => {
            this.$notify.success(response.data)
            this.$emit('ok', this.generatedAsset);
          })
          .catch(error => this.$notify.error(error.response.data))

      }

    },
    cancel () {
      this.$emit('cancel')
    },
  },
  computed: {
    canAdd(): boolean {
      return !!this.assetGainstrack;
    },
    baseCcy(): string {
      return this.$store.getters.baseCcy;
    },
    allStateEx(): AllStateEx {
      return this.$store.getters.allStateEx;
    },
    globalPricer (): GlobalPricer {
      return this.$store.getters.fxConverter;
    },
    schemas(): AssetProperty[] {
      return selectedPropertiesForAsset(this.properties);
    },
    availableTags(): AssetProperty[] {
      return availablePropertiesForAsset(this.properties, {editing: true})
    },
    generatedAsset(): AssetDTO {
      return createAssetFromProps(this.properties)
    },
    generatedAssetCommand(): AccountCommandDTO {
      return {...this.generatedAsset, commandType: 'commodity', accountId: '', date: '1900-01-01'}
    },
    assetPrice():string {
      const asset = this.generatedAsset;
      const pricer = this.globalPricer;
      const baseCcy:string = this.baseCcy;
      const today = LocalDate.now();
      const price = pricer.getPrice(asset, baseCcy, today);
      return formatNumber(price);
    },
    assetGainstrack(): string {
      return toGainstrack(this.generatedAssetCommand)
    },
    commandGainstrack(): string {
      if (this.accountId) {
        const asset = this.generatedAsset;
        const today = this.properties['date'] || LocalDate.now();
        const cmd:AccountCommandDTO = {
          commandType: 'balunit',
          accountId: this.accountId,
          date: today.toString(),
          balance: {number: this.properties['units'] ?? 1, ccy: asset.asset},
        };
        if (this.properties['price']) {
          cmd.price = this.properties['price']
        }

        const dcmd = defaultedBalanceOrUnit(cmd, this.allStateEx, this.globalPricer);
        const gainstrack = toGainstrack(dcmd);
        return gainstrack;
      } else {
        return '';
      }

    }
  }
})
</script>

<style scoped>

</style>
