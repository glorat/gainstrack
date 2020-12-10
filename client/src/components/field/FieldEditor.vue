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
  <q-select
    v-else-if="type==='category'"
    :options="assetCategories"
    :value="modelValue" @input="inputChanged($event.value)"
    :display-value="modelValue"
    >
    <template v-slot:option="scope">
      <q-item v-bind="scope.itemProps" v-on="scope.itemEvents">
        <q-item-section>
          <q-item-label>{{ scope.opt.label }}</q-item-label>
          <q-item-label caption>{{ scope.opt.description }}</q-item-label>
        </q-item-section>
      </q-item>
    </template>
  </q-select>
  <q-select
    v-else-if="typeIsEnum"
    :value="modelValue" @input="inputChanged($event.value)"
    :label="label"
    :options="enumOptions" emit-value
  >
    <template v-slot:option="scope">
      <q-item v-bind="scope.itemProps" v-on="scope.itemEvents">
        <q-item-section>
          <q-item-label>{{ scope.opt.value }}</q-item-label>
          <q-item-label caption>{{ scope.opt.description }}</q-item-label>
        </q-item-section>
      </q-item>
    </template>
  </q-select>
  <div v-else>UNKNOWN TYPE {{ type }}</div>
</template>

<script lang="ts">
import {defineComponent, PropType} from '@vue/composition-api';
import CommandDateEditor from '../CommandDateEditor.vue';
import BalanceEditor from 'components/command/BalanceEditor.vue';
import AssetId from 'components/AssetId.vue';
import {assetCategories, AssetProperty} from 'src/lib/AssetSchema';
import TickerSelect from 'components/field/TickerSelect.vue';

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
    },
    label: {
      type: String,
      required: false,
    }
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
