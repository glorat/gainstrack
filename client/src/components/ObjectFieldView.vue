<template>
  <div>
    <template v-for="fld in displayFields">
      <div class="col-6">
        {{ fld.label}}
        <q-tooltip>{{ fld.description}}</q-tooltip>
      </div>
      <div class="col-6 text-right">{{ object[fld.name] }}</div>
    </template>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {FieldProperty} from 'src/lib/AssetSchema';
  import {includes} from 'lodash';

  export default Vue.extend({
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
