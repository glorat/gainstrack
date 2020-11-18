<template>
  <q-card>
    <q-card-section>Define New Asset</q-card-section>
    <q-card-section>
      <div v-for="schema in schemas" :key="schema.label">
        <q-chip color="primary" text-color="white" :label="schema.name"
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
    <q-card-section>
      {{ assetPrice }}
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import {defineComponent} from '@vue/composition-api';
import FieldEditor from './field/FieldEditor.vue';
import {keys} from 'lodash';
import {AssetProperty, createAssetFromProps, schemaFor, validPropertiesForAsset} from 'src/lib/AssetSchema';
import {AssetDTO} from 'src/lib/models';
import {GlobalPricer} from 'src/lib/pricer';
import {LocalDate} from '@js-joda/core';
import {formatNumber} from 'src/lib/utils';

export default defineComponent({
  name: 'NewAssetEditor',
  components: {FieldEditor},
  data() {
    const properties: Record<string, any> = {}
    return {
      properties
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
    }
  },
  computed: {
    baseCcy(): string {
      return this.$store.getters.baseCcy;
    },
    globalPricer (): GlobalPricer {
      return this.$store.getters.fxConverter;
    },
    baseCcy (): string {
      return this.$store.getters.baseCcy;
    },
    schemas(): AssetProperty[] {
      const nms = keys(this.properties).sort();
      return nms.map(schemaFor)
    },
    availableTags(): AssetProperty[] {
      return validPropertiesForAsset(this.properties, {editing: false})
    },
    generatedAsset(): AssetDTO {
      return createAssetFromProps(this.properties)
    },
    assetPrice():string {
      const asset = this.generatedAsset;
      const pricer = this.globalPricer;
      const baseCcy:string = this.baseCcy;
      const today = LocalDate.now();
      const price = pricer.getPrice(asset, baseCcy, today);
      return formatNumber(price);
    },
  }
})
</script>

<style scoped>

</style>
