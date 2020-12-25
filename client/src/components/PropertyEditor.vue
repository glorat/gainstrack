<template>
  <q-card-section>
    <div v-for="schema in assetProperties" :key="schema.label">
      <q-chip color="primary" text-color="white" :label="schema.label"
              removable
              @remove="onRemove(schema)"
      ></q-chip>
      <span>{{ schema.description }}</span>
      <field-editor
        :schema="schema"
        :model-value="value[schema.name]"
        @input="onFieldUpdate(schema.name, $event)"
      ></field-editor>
    </div>
    <q-chip v-for="tag in availableTags"
            :key="tag.name" color="primary" text-color="white" :label="tag.label"
            clickable @click="$set(value, tag.name, undefined)"></q-chip>
  </q-card-section>
</template>

<script lang="ts">
  import Vue from 'vue';
  import FieldEditor from 'components/field/FieldEditor.vue';
  import {
    AssetProperty, AssetSchema,
    userAssetSchema
  } from 'src/lib/AssetSchema';

  export default Vue.extend({
    name: 'PropertyEditor',
    components: {FieldEditor},
    props: {
      schema: {
        type: Object as () => AssetSchema,
        default: () => userAssetSchema
      },
      value: {
        type: Object as () => Record<string, any>,
        default: () => ({} as Record<string, any>)
      }
    },
    methods: {
      onFieldUpdate(field:string, newValue: any) {
        this.$set(this.value, field, newValue);
        // if (newValue && schemaFor(field).schema==='ticker') {
        //   this.$store.dispatch('loadQuotes', newValue);
        // }
      },
      onRemove(propType: AssetProperty) {
        this.$delete(this.value, propType.name);
      },
    },
    computed: {
      assetProperties(): AssetProperty[] {
        return this.schema.selectedPropertiesForAsset(this.value);
      },
      availableTags(): AssetProperty[] {
        return this.schema.availablePropertiesForAsset(this.value)
      },
    }
  })
</script>

<style scoped>

</style>
