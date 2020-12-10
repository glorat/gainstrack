<template>
  <q-select :value="modelValue" @input="$emit('input', $event)" :label="label"
            :options="displayOptions" emit-value
            use-input @filter="filterFn"
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
import Vue from 'vue';

export default Vue.extend({
  name: 'EnumSelect',
  // Forward looking for vue-3
  model: {
    prop: 'modelValue',
  },
  props: {
    modelValue: String,
    options: Array as () => {value: string, description: string}[],
    label: String,
  },
  data() {
    const displayOptions: {value: string, description: string}[] = this.options
    return {
      displayOptions,
    }
  },
  methods: {
    filterFn (val: string, update: any) {
      update(() => {
        const needle = val.toLowerCase()
        this.displayOptions = this.options.filter(v => v.value.toLowerCase().indexOf(needle) > -1)
      })
    }
  }
})
</script>

<style scoped>

</style>
