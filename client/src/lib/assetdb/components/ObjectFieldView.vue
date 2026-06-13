<template>
  <div>
    <template v-for="fld in displayFields">
      <div class="col-6">
        {{ fld.label}}
        <q-tooltip>{{ fld.description}}</q-tooltip>
      </div>
      <div class="col-6 text-right">
        {{ fieldString(object, fld) }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {includes} from 'lodash';
import {FieldProperty} from '../schema';

const props = defineProps<{
  fieldProperties: FieldProperty[]
  object: Record<string, any>
}>();

function fieldString(object: Record<string, any>, field: FieldProperty) {
  const val = object[field.name];
  if (field.fieldType === 'multiEnum') {
    return Object.keys(val??[]).join(', ');
  } else {
    return val;
  }
}

const displayFields = computed((): FieldProperty[] => {
  return props.fieldProperties.filter(x => (
    (!includes(['object', 'array'], x.fieldType)) && (!x.valid || x.valid(props.object))
  ))
})
</script>

<style scoped>

</style>
