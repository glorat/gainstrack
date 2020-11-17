<template>
  <command-date-editor
    v-if="type==='date'"
    :value="modelValue" @input="inputChanged($event)"></command-date-editor>
  <balance-editor
    v-else-if="type==='balance'"
    :value="modelValue" @input="inputChanged($event)"></balance-editor>
  <asset-id
    v-else-if="type==='asset'"
    :value="modelValue" @input="inputChanged($event)"></asset-id>
  <ticker-select
    v-else-if="type==='ticker'"
    :value="modelValue" @input="inputChanged($event)"></ticker-select>

  <div v-else>UNKNOWN TYPE {{ type }}</div>
</template>

<script lang="ts">
import {defineComponent, PropType} from '@vue/composition-api';
import CommandDateEditor from '../CommandDateEditor.vue';
import BalanceEditor from 'components/command/BalanceEditor.vue';
import AssetId from 'components/AssetId.vue';
import {AssetProperty} from 'src/lib/AssetSchema';
import TickerSelect from "components/field/TickerSelect.vue";

export default defineComponent({
  name: 'FieldEditor',
  components: {CommandDateEditor, BalanceEditor, AssetId, TickerSelect},
  // Forward looking for vue-3
  model: {
    prop: 'modelValue',
  },
  props: {
    modelValue: {},
    schema: {
      type: (Object as unknown) as PropType<AssetProperty>,
      required: true,
    }
  },
  methods: {
    inputChanged($event:any) {
      this.$emit('input', $event)
    },
  },
  computed: {
    type():string {
      const s:AssetProperty = this.schema;
      return s.schema
    }
  }
})
</script>

<style scoped>

</style>
