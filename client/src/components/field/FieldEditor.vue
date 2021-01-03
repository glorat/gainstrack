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
  <q-input
    v-else-if="type==='number'"
    :value="modelValue" @input="inputChanged($event)" type="number"
    ></q-input>
  <q-input
    v-else-if="type==='string'"
    :value="modelValue" :label="schema.label"
    :clearable="clearable"
    @clear="cleared" @input="inputChanged($event)"
  ></q-input>
  <enum-select
    v-else-if="type==='category'"
    :options="assetCategories"
    :model-value="modelValue"
    :clearable="clearable"
    @clear="cleared" @input="inputChanged($event)"
    >
  </enum-select>
  <enum-select
    v-else-if="type==='enum'"
    :model-value="modelValue"
    :label="schema.label"
    :options="schema.fieldMeta"
    :clearable="clearable"
    @clear="cleared" @input="inputChanged($event)"
  >
  </enum-select>
  <div v-else>UNKNOWN TYPE {{ type }}</div>
</template>

<script lang="ts">
import {defineComponent, PropType} from '@vue/composition-api';
import CommandDateEditor from '../CommandDateEditor.vue';
import BalanceEditor from 'components/command/BalanceEditor.vue';
import AssetId from 'components/AssetId.vue';
import {AssetProperty} from 'src/lib/AssetSchema';
import TickerSelect from 'components/field/TickerSelect.vue';
import {assetCategories} from 'src/lib/enums';
import EnumSelect from 'components/field/EnumSelect.vue';

export default defineComponent({
  name: 'FieldEditor',
  components: {CommandDateEditor, BalanceEditor, AssetId, TickerSelect, EnumSelect},
  // Forward looking for vue-3
  model: {
    prop: 'modelValue',
  },
  props: {
    modelValue: {},
    schema: {
      type: (Object as unknown) as PropType<AssetProperty>,
      required: true,
    },
    label: {
      type: String,
      required: false,
    },
    clearable: Boolean,
  },
  data() {
    return {
      assetCategories
    }
  },
  methods: {
    inputChanged($event:any) {
      this.$emit('input', $event)
    },
    cleared() {
      this.$emit('clear')
    }
  },
  computed: {
    type():string {
      const s:AssetProperty = this.schema;
      return s.fieldType
    }
  }
})
</script>

<style scoped>

</style>
