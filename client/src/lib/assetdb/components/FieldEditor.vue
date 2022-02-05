<template>
  <command-date-editor
    v-if="type==='date'"
    :modelValue="modelValue" @update:modelValue="inputChanged($event)"></command-date-editor>
  <balance-editor
    v-else-if="type==='balance'"
    :modelValue="modelValue" @update:modelValue="inputChanged($event)"></balance-editor>
  <asset-id
    v-else-if="type==='asset'"
    :modelValue="modelValue" @update:modelValue="inputChanged($event)"></asset-id>
  <ticker-select
    v-else-if="type==='ticker'"
    :modelValue="modelValue" @update:modelValue="inputChanged($event)"></ticker-select>
  <q-input
    v-else-if="type==='number'"
    :modelValue="modelValue" type="number"
    :clearable="clearable" :dense="dense"
    @clear="cleared" @update:modelValue="inputChanged($event)"
    ></q-input>
  <q-input
    v-else-if="type==='percentage'"
    :modelValue="modelValue" type="number"
    suffix="%"
    :clearable="clearable" :dense="dense"
    @clear="cleared" @update:modelValue="inputChanged($event)"
  ></q-input>
  <q-input
    v-else-if="type==='string'"
    :modelValue="modelValue" :label="schema.label"
    :clearable="clearable" :dense="dense"
    @clear="cleared" @update:modelValue="inputChanged($event)"
  ></q-input>
  <enum-select
    v-else-if="type==='category'"
    :options="assetCategories"
    :modelValue="modelValue"
    :clearable="clearable" :dense="dense"
    @clear="cleared" @update:modelValue="inputChanged($event)"
    >
  </enum-select>
  <enum-select
    v-else-if="type==='enum'"
    :modelValue="modelValue"
    :label="schema.label"
    :options="schema.fieldMeta"
    :clearable="clearable" :dense="dense"
    @clear="cleared" @update:modelValue="inputChanged($event)"
  >
  </enum-select>
  <multi-enum-select
    v-else-if="type==='multiEnum'"
    :modelValue="modelValue"
    :label="schema.label"
    :options="schema.fieldMeta"
    :clerable="clearable" :dense="dense"
    @clear="cleared" @update:modelValue="inputChanged($event)"
  >
  </multi-enum-select>
  <div
    v-else-if="type==='array'"
  >
    {{ schema.label }} <q-btn label="+" color="secondary" @click="arrayAdd"></q-btn>
    <field-editor
      v-for="(sub, idx) in modelValue"
      :key="idx"
      :schema="schema.fieldMeta" :modelValue="sub"
      :clearable="clearable" :dense="dense"
      @clear="arrayCleared(idx)"
      @update:modelValue="arrayInput(idx, $event)"
    >

    </field-editor>

  </div>
  <div v-else-if="type==='object'"></div>
  <div v-else>UNKNOWN TYPE {{ type }}</div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import CommandDateEditor from 'components/CommandDateEditor.vue';
import BalanceEditor from './BalanceEditor.vue';
import AssetId from './AssetId.vue';
import TickerSelect from './TickerSelect.vue';
import {assetCategories} from 'src/lib/assetdb/enums';
import EnumSelect from './EnumSelect.vue';
import MultiEnumSelect from './MultiEnumSelect.vue';
import {FieldProperty} from '../schema';

export default defineComponent({
  name: 'FieldEditor',
  components: {CommandDateEditor, BalanceEditor, AssetId, TickerSelect, EnumSelect, MultiEnumSelect},
  // Forward looking for vue-3
  model: {
    prop: 'modelValue',
  },
  props: {
    modelValue: {},
    schema: {
      type: (Object as unknown) as PropType<FieldProperty>,
      required: true,
    },
    clearable: Boolean,
    dense: Boolean,
  },
  data() {
    return {
      assetCategories
    }
  },
  methods: {
    inputChanged($event:any) {
      this.$emit('update:modelValue', $event)
    },
    cleared() {
      this.$emit('clear')
    },
    arrayCleared(idx: number) {
      const orig:any = this.modelValue;
      if (orig.length>1) {
        orig.splice(idx, 1);
        this.$emit('update:modelValue', orig);
      } else {
        // Last element cleared, remove the whole lot
        this.$emit('clear');
      }

    },
    arrayInput(idx: number, ev: any) {
      const orig:any = this.modelValue; // To clone or not to clone???
      orig[idx] = ev;
      this.$emit('update:modelValue', orig);
    },
    arrayAdd() {
      const orig:any = this.modelValue ?? [];
      this.$emit('update:modelValue', [...orig, undefined]);
    }
  },
  computed: {
    type():string {
      const s:FieldProperty = this.schema;
      return s.fieldType
    }
  }
})
</script>

<style scoped>

</style>
