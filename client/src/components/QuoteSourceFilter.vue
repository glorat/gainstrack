<template>
  <div>
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

    <div class="row">
      <div class="col-6">
        <q-btn color="secondary" label="Add Filter" @click="query.push({where:['','==','']})"></q-btn>
        <q-select v-if="columnEditing" label="Add Column" :options="fieldsToAdd" value="" @input="$emit('update:selected-columns', [...selectedColumns, $event.value] )"></q-select>
        <q-btn v-if="!columnEditing" color="secondary" label="Edit Columns" @click="$emit('update:column-editing', true)"></q-btn>
      </div>
      <div class="col-6">
        <q-btn color="primary" label="Search" :icon="matSearch" @click="onSearch"></q-btn>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {FieldProperty, getFieldNameList, quoteSourceFieldProperties, unknownFieldProperty} from 'src/lib/AssetSchema';
import {EnumEntry, whereOps} from 'src/lib/enums';
import {matSearch} from '@quasar/extras/material-icons';
import FieldEditor from 'components/field/FieldEditor.vue';
import {find, includes} from 'lodash';

function findProperty(path: string, rootProps: FieldProperty[]): FieldProperty {
  if (!path.split) {debugger;}

  let bits = path.split('.')
  let prop: FieldProperty|undefined = undefined
  let props = rootProps;

  while (bits.length>0) {
    const top = bits.shift();
    prop = find(props, p => p.name === top)
    if (prop === undefined) {
      return unknownFieldProperty;
    } else if (prop.fieldType === 'object') {
      props = prop.fieldMeta as FieldProperty[];
    } else if (bits.length > 0) {
      debugger;
      return unknownFieldProperty; // Sub path but not object
      // TODO: Add array clause?
    }
  }

  return prop ?? unknownFieldProperty;
}

export default Vue.extend({
  name: 'QuoteSourceFilter',
  components: {FieldEditor},
  props: {
    query: {
      type: Array,
      default: () => [] as any[]
    },
    selectedColumns: {
      type: Array as () => string[],
    },
    columnEditing: {
      type: Boolean
    }
  },
  data() {
    return {
      whereOps,
      matSearch
    }
  },
  computed: {
    fieldList(): EnumEntry[] {
      return getFieldNameList(quoteSourceFieldProperties)
    },
    fieldsToAdd(): EnumEntry[] {
      return this.fieldList.filter(en => !includes(this.selectedColumns, en.value))
    },
    queryFieldProperties(): FieldProperty[] {
      const names: string[] = this.query.map(row => row.where[0])
      return names.map(nm => findProperty(nm ?? '', quoteSourceFieldProperties))
    }
  },
  methods: {
    onSearch() {
      this.$emit('search', this.query)
      this.$emit('update:column-editing', false)
    }
  }
})
</script>

<style scoped>

</style>
