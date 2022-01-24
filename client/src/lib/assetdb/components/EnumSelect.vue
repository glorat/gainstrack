<template>
  <q-select :value="modelValue" @input="$emit('input', $event)" :label="label"
            :options="displayOptions" emit-value
            use-input @filter="filterFn"
            :display-value="displayValue"
            :clearable="clearable" :dense="dense"
            @clear="$emit('clear')"
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
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {EnumEntry} from '../enums';

export default defineComponent({
  name: 'EnumSelect',
  // Forward looking for vue-3
  model: {
    prop: 'modelValue',
  },
  props: {
    modelValue: String,
    options: Array as () => EnumEntry[],
    label: String,
    clearable: Boolean,
    dense: Boolean,
  },
  data() {
    const displayOptions: EnumEntry[] = this.options ?? []
    return {
      displayOptions,
    }
  },
  methods: {
    filterFn (val: string, update: any) {
      update(() => {
        const needle = val.toLowerCase()
        this.displayOptions = this.options?.filter(v => v.value.toLowerCase().indexOf(needle) > -1) ?? []
      })
    }
  },
  computed: {
    displayValue(): string|undefined {
      return this.options?.find(x => x.value === this.modelValue)?.label
    },
  }
})
</script>

<style scoped>

</style>
