<template>
  <q-select :modelValue="selectValue" @update:modelValue="onInput" :label="label"
            :options="displayOptions"
            multiple use-chips
            use-input @filter="filterFn"
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
  import {EnumEntry, simpleEnumEntry} from 'src/lib/assetdb/enums';

  export default defineComponent({
    name: 'MultiEnumSelect',
    // Forward looking for vue-3
    model: {
      prop: 'modelValue',
    },
    props: {
      modelValue: Object as ()=>Record<string, boolean>,
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
      },
      onInput(vals: EnumEntry[]): void {
        const ret:Record<string, boolean> = {};
        vals.forEach(val => {
          ret[val.value] = true
        });

        this.$emit('input', ret);
      }
    },
    computed: {
      selectValue(): EnumEntry[] {
        const modelValue = this.modelValue ?? {};
        return Object.keys(modelValue)
          .filter(k => modelValue[k]) // only truthy ones
          .map(key => this.options?.find(o => o.value === key) ?? simpleEnumEntry(key))
      },
      // displayValue(): string|undefined {
      //   return this.options.find(x => x.value === this.modelValue)?.label
      // },
    }
  })
</script>

<style scoped>

</style>
