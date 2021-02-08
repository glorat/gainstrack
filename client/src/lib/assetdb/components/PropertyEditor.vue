<template>
  <q-card-section>
    <div v-for="schema in assetProperties" :key="schema.label">
      <field-editor
        :schema="schema"
        :model-value="value[schema.name]"
        clearable :dense="dense"
        @input="onFieldUpdate(schema.name, $event)"
        @clear="onFieldCleared(schema.name)"
      ></field-editor>
    </div>
    <q-chip v-for="tag in availableTags"
            :key="tag.name" color="primary" text-color="white" :label="tag.label"
            size="sm"
            clickable @click="onFieldAdd(tag.name)">
      <q-tooltip>{{ tag.description}}</q-tooltip>
    </q-chip>
  </q-card-section>
</template>

<script lang="ts">
  import Vue from 'vue';
  import FieldEditor from './FieldEditor.vue';
  import {
    userAssetSchema
  } from '../AssetSchema';
  import {FieldProperty, Schema} from '../schema';

  export default Vue.extend({
    name: 'PropertyEditor',
    components: {FieldEditor},
    props: {
      schema: {
        type: Object as () => Schema,
        default: () => userAssetSchema
      },
      value: {
        type: Object as () => Record<string, any>,
        default: () => ({} as Record<string, any>)
      },
      dense: Boolean,
    },
    methods: {
      onFieldUpdate(field:string, newValue: any) {
        this.$set(this.value, field, newValue);
        // if (newValue && schemaFor(field).schema==='ticker') {
        //   this.$store.dispatch('loadQuotes', newValue);
        // }
      },
      onFieldCleared(field: string) {
        this.$delete(this.value, field);
        this.$emit('property-removed', field);
      },
      onFieldAdd(name: string) {
        this.$set(this.value, name, undefined);
        this.$emit('property-added', name);
      },
      onRemove(propType: FieldProperty) {
        this.$delete(this.value, propType.name);
      },
    },
    computed: {
      assetProperties(): FieldProperty[] {
        return this.schema.selectedPropertiesForAsset(this.value);
      },
      availableTags(): FieldProperty[] {
        return this.schema.availablePropertiesForAsset(this.value)
      },
    }
  })
</script>

<style scoped>

</style>
