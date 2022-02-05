<template>
  <q-card-section>
    <div v-for="schema in assetProperties" :key="schema.label">
      <field-editor
        :schema="schema"
        :modelValue="modelValue[schema.name]"
        clearable :dense="dense"
        @update:modelValue="onFieldUpdate(schema.name, $event)"
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
  import {defineComponent} from 'vue';
  import FieldEditor from './FieldEditor.vue';
  import {
    userAssetSchema
  } from '../AssetSchema';
  import {FieldProperty, Schema} from '../schema';

  export default defineComponent({
    name: 'PropertyEditor',
    components: {FieldEditor},
    props: {
      schema: {
        type: Object as () => Schema,
        default: () => userAssetSchema
      },
      modelValue: {
        type: Object as () => Record<string, any>,
        default: () => ({} as Record<string, any>)
      },
      dense: Boolean,
    },
    methods: {
      onFieldUpdate(field:string, newValue: any) {
        const ret = {...this.modelValue, [field]:newValue};
        this.$emit('update:modelValue', ret);
        // if (newValue && schemaFor(field).schema==='ticker') {
        //   this.$store.dispatch('loadQuotes', newValue);
        // }
      },
      onFieldCleared(field: string) {
        console.log(`${field} cleared`);
        const ret = {...this.modelValue};
        delete ret[field];
        this.$emit('update:modelValue', ret);
        this.$emit('property-removed', field);
      },
      onFieldAdd(name: string) {
        const ret = {...this.modelValue, [name]:undefined};
        this.$emit('property-added', name);
        this.$emit('update:modelValue', ret);
      },
      onRemove(propType: FieldProperty) {
        const ret = {...this.modelValue};
        delete ret[propType.name]
        this.$emit('update:modelValue', ret);
      },
    },
    computed: {
      assetProperties(): FieldProperty[] {
        return this.schema.selectedPropertiesForAsset(this.modelValue);
      },
      availableTags(): FieldProperty[] {
        return this.schema.availablePropertiesForAsset(this.modelValue)
      },
    }
  })
</script>

<style scoped>

</style>
