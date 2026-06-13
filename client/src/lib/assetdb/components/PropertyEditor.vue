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

<script setup lang="ts">
import { computed } from 'vue';
import FieldEditor from './FieldEditor.vue';
import {userAssetSchema} from '../AssetSchema';
import {FieldProperty, Schema} from '../schema';

const props = withDefaults(defineProps<{
  schema?: Schema
  modelValue?: Record<string, any>
  dense?: boolean
}>(), {
  schema: () => userAssetSchema,
  modelValue: () => ({} as Record<string, any>)
});

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
  'property-removed': [field: string]
  'property-added': [name: string]
}>();

function onFieldUpdate(field: string, newValue: any) {
  emit('update:modelValue', {...props.modelValue, [field]: newValue});
}

function onFieldCleared(field: string) {
  console.log(`${field} cleared`);
  const ret = {...props.modelValue};
  delete ret[field];
  emit('update:modelValue', ret);
  emit('property-removed', field);
}

function onFieldAdd(name: string) {
  emit('property-added', name);
  emit('update:modelValue', {...props.modelValue, [name]: undefined});
}

function onRemove(propType: FieldProperty) {
  const ret = {...props.modelValue};
  delete ret[propType.name];
  emit('update:modelValue', ret);
}

const assetProperties = computed((): FieldProperty[] => props.schema!.selectedPropertiesForAsset(props.modelValue!));
const availableTags = computed((): FieldProperty[] => props.schema!.availablePropertiesForAsset(props.modelValue!));
</script>

<style scoped>

</style>
