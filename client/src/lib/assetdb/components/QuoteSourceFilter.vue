<template>
  <div>
    <q-stepper v-model="step" header-nav>
      <q-step :name="1" title="Filter" :icon="matFilterAlt">
        <property-editor :model-value="searchObj.asset" @update:modelValue="onAssetUpdate" :schema="investmentAssetSearchSchema" dense @property-added="onPropAdded"></property-editor>
        <property-editor :model-value="searchObj" @update:modelValue="onObjUpdated" :schema="quoteSourceSearchSchema" dense @property-added="onPropAdded"></property-editor>
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
          <q-btn color="secondary" label="Custom Filter" @click="$emit('update:params', {...params, query: [...(params.query ?? []), {where:['','==','']}]})"></q-btn>
        </div>

      </q-step>
      <q-step :name="3" title="Columns">
        <div class="col-6">
          <q-select label="Add Column" :options="fieldsToAdd" :model-value="''" emit-value @update:model-value="$emit('update:selectedColumns', [...(selectedColumns ?? []), $event])"></q-select>
        </div>
      </q-step>
<!--      <q-step :name="4" title="Search" :icon="matSearch" color="primary">-->
<!--        <p>You can save this search by bookmarking or copying the URL</p>-->
<!--        <q-btn color="primary" label="Refresh" :icon="matSearch" @click="onSearch"></q-btn>-->
<!--      </q-step>-->
    </q-stepper>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  investmentAssetSearchSchema,
  quoteSourceFieldProperties, quoteSourceSearchSchema,
} from '../AssetSchema';
import { EnumEntry, whereOps } from '../enums';
import { matFilterAlt } from '@quasar/extras/material-icons';
import FieldEditor from './FieldEditor.vue';
import { includes } from 'lodash';
import PropertyEditor from './PropertyEditor.vue';
import { FieldProperty, findProperty, getFieldNameList } from '../schema';

const props = defineProps<{
  params: Record<string, any>
  selectedColumns?: string[]
  columnEditing?: boolean
}>();

const emit = defineEmits<{
  'update:params': [value: Record<string, any>]
  'update:column-editing': [value: boolean]
  'update:selectedColumns': [value: string[]]
  'search': [params: Record<string, any>]
}>();

const step = ref(1);

const query = computed((): any[] => props.params.query);
const searchObj = computed(() => props.params.searchObj);
const fieldList = computed((): EnumEntry[] => getFieldNameList(quoteSourceFieldProperties));
const fieldsToAdd = computed((): EnumEntry[] => fieldList.value.filter(en => !includes(props.selectedColumns, en.value)));
const queryFieldProperties = computed((): FieldProperty[] => {
  const names: string[] = props.params.query.map((row: any) => row.where[0]);
  return names.map(nm => findProperty(nm ?? '', quoteSourceFieldProperties));
});

watch(step, newVal => {
  if (newVal === 3) {
    emit('update:column-editing', true);
  } else if (newVal === 4) {
    onSearch();
  } else {
    emit('update:column-editing', false);
  }
});

function onSearch() {
  const params = { ...props.params };
  params.fields = props.selectedColumns;
  emit('search', params);
  emit('update:column-editing', false);
}

function onAssetUpdate(asset: any) {
  emit('update:params', { ...props.params, searchObj: { ...props.params.searchObj, asset } });
}

function onObjUpdated(searchObjVal: any) {
  emit('update:params', { ...props.params, searchObj: searchObjVal });
}

function onPropAdded() {
  refreshColumns();
}

function refreshColumns() {
  if (!props.columnEditing) {
    const columnCount = 8;
    const searchObjVal = props.params.searchObj;
    const name = 'name';
    const one = quoteSourceSearchSchema.availablePropertiesForAsset(searchObjVal).map((x: any) => x.name);
    let final: string[];
    if (one.length >= columnCount) {
      final = [name, ...one.slice(0, columnCount)];
    } else {
      const two = investmentAssetSearchSchema.availablePropertiesForAsset(searchObjVal.asset)
        .slice(0, columnCount - one.length)
        .map((x: any) => `asset.${x.name}`);
      final = [name, ...one, ...two];
    }
    const a = [...(props.selectedColumns ?? [])];
    a.splice(0, props.selectedColumns!.length, ...final);
    emit('update:selectedColumns', a);
  }
}
</script>

<style scoped>

</style>
