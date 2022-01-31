<template>
  <div>
    <q-stepper v-model="step" header-nav>
      <q-step :name="1" title="Filter" :icon="matFilterAlt">
        <property-editor v-model="searchObj.asset" :schema="investmentAssetSearchSchema" dense @property-added="onPropAdded($event, 'asset')"></property-editor>
        <property-editor v-model="searchObj" :schema="quoteSourceSearchSchema" dense @property-added="onPropAdded($event)"></property-editor>
      </q-step>
      <q-step :name="2" title="Advanced Filter" :icon="matFilterAlt">
        <div class="row" v-for="(row,idx) in query">
          <div class="col-sm-5 col-xs-12">
            <q-select :options="fieldList" v-model="row.where[0]" clearable @clear="query.splice(idx, 1)" emit-value></q-select>
          </div>
          <div class="col-sm-2 col-xs-1">
            <q-select :options="whereOps" v-model="row.where[1]" emit-value></q-select>
          </div>
          <div class="col-sm-5 col-xs-11">
            <field-editor v-model="row.where[2]" :schema="queryFieldProperties[idx]"></field-editor>
          </div>
        </div>
        <div class="row" title="">
          <q-btn color="secondary" label="Custom Filter" @click="$emit('update:params', [...params, {where:['','==','']}])"></q-btn>
        </div>

      </q-step>
      <q-step :name="3" title="Columns">
        <div class="col-6">
          <q-select label="Add Column" :options="fieldsToAdd" value="" @input="$emit('update:selected-columns', [...selectedColumns, $event.value] )"></q-select>
        </div>
      </q-step>
<!--      <q-step :name="4" title="Search" :icon="matSearch" color="primary">-->
<!--        <p>You can save this search by bookmarking or copying the URL</p>-->
<!--        <q-btn color="primary" label="Refresh" :icon="matSearch" @click="onSearch"></q-btn>-->
<!--      </q-step>-->
    </q-stepper>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {
  investmentAssetSearchSchema,
  quoteSourceFieldProperties, quoteSourceSearchSchema,
} from '../AssetSchema';
import {EnumEntry, whereOps} from '../enums';
import {matSearch, matFilterAlt} from '@quasar/extras/material-icons';
import FieldEditor from './FieldEditor.vue';
import {includes} from 'lodash';
import PropertyEditor from './PropertyEditor.vue';
import {FieldProperty, findProperty, getFieldNameList} from '../schema';

export default defineComponent({
  name: 'QuoteSourceFilter',
  components: {FieldEditor, PropertyEditor},
  props: {
    params: {
      type: Object,
      required: true,
    },
    selectedColumns: {
      type: Array as () => string[],
    },
    columnEditing: {
      type: Boolean
    }
  },
  data() {
    const step = 1;
    return {
      step,
      whereOps,
      matSearch,
      matFilterAlt,
      investmentAssetSearchSchema,
      quoteSourceSearchSchema,

    }
  },
  computed: {
    query(): any[] {
      return this.params.query;
    },
    searchObj(): any {
      return this.params.searchObj;
    },
    fieldList(): EnumEntry[] {
      return getFieldNameList(quoteSourceFieldProperties)
    },
    fieldsToAdd(): EnumEntry[] {
      return this.fieldList.filter(en => !includes(this.selectedColumns, en.value))
    },
    queryFieldProperties(): FieldProperty[] {
      const names: string[] = this.params.query.map((row:any) => row.where[0]);
      return names.map(nm => findProperty(nm ?? '', quoteSourceFieldProperties))
    },
  },
  watch: {
    step(newVal: number) {
      if (newVal === 3) {
        this.$emit('update:column-editing', true)
      } else if (newVal === 4) {
        this.onSearch();
      } else {
        this.$emit('update:column-editing', false)
      }
    }
  },
  methods: {
    onSearch() {
      const params = {...this.params};
      params.fields = this.selectedColumns;
      this.$emit('search', params);
      this.$emit('update:column-editing', false)
    },
    // onPropAdded(field: string, path?: string) {
    onPropAdded() {
      this.refreshColumns();
      // const fullPath = path ? `${path}.${field}` : field;
      // const idx = this.selectedColumns.findIndex(x => x === fullPath);
      // if (idx>=0) {
      //   // Remove a column we are filtering on (since all values would be the same)
      //   this.selectedColumns.splice(idx, 1);
      //   // But try to add back one
      //   const avail = investmentAssetSearchSchema.availablePropertiesForAsset(this.searchObj.asset);
      //   const toAdd = avail.find(candidate => !this.selectedColumns.find(col => col === `asset.${candidate.name}`));
      //   if (toAdd) {
      //     this.selectedColumns.push(`asset.${toAdd.name}`)
      //   }
      // }
    },
    refreshColumns() {
      if (!this.columnEditing) {
        // Automatically determine columns
        const columnCount = 8; // How many to have... a sensible hardcoded number
        const searchObj = this.params.searchObj;
        const name = 'name'; // mandatory
        const one = quoteSourceSearchSchema.availablePropertiesForAsset(searchObj).map(x => x.name);
        let final;
        if (one.length >= columnCount) {
          final = [name, ...one.slice(0, columnCount)];
        } else {
          const two = investmentAssetSearchSchema.availablePropertiesForAsset(searchObj.asset)
            .slice(0, columnCount-one.length)
            .map( x => `asset.${x.name}`);
          final = [name, ...one, ...two];
        }
        const a = [...this.selectedColumns ?? []];

        a.splice(0, this.selectedColumns!.length, ...final);
        this.$emit('update:selectedColumns', a);

      }
    }
  }
})
</script>

<style scoped>

</style>
