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

<script lang="ts">
  import {defineComponent} from 'vue';
  import {includes} from 'lodash';
  import {FieldProperty} from '../schema';

  export default defineComponent({
    name: 'ObjectFieldView',
    props: {
      fieldProperties: {
        type: Array as () => FieldProperty[]
        , required: true},
      object: {
        type: Object as () => Record<string, unknown>,
        required: true,
      }
    },
    methods: {
      fieldString(object: Record<string, any>, field: FieldProperty) {
        const val = object[field.name];
        if (field.fieldType === 'multiEnum') {
          return Object.keys(val??[]).join(', ');
        } else {
          return val;
        }
      }
    },
    computed: {
      displayFields():FieldProperty[] {
        const props: FieldProperty[] = this.fieldProperties;
        return props.filter(x => (
          (!includes(['object', 'array'], x.fieldType)) && (!x.valid || x.valid(this.object))
        ))
      }
    }
  })
</script>

<style scoped>

</style>
