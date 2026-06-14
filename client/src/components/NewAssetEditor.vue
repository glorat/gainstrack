<template>
  <q-card>
    <q-card-section class="text-h6">Define Asset</q-card-section>
    <q-card-section>
      <div v-for="schema in schemas" :key="schema.label">
        <q-chip color="primary" text-color="white" :label="schema.label"
                removable
                @remove="onRemove(schema)"
        ></q-chip>
        <span>{{ schema.description }}</span>
        <field-editor
          :schema="schema"
          :modelValue="properties[schema.name]"
          @update:modelValue="onFieldUpdate(schema.name, $event)"
        ></field-editor>
      </div>
    </q-card-section>
    <q-card-section>
      <q-chip v-for="tag in availableTags"
              :key="tag.name" color="primary" text-color="white" :label="tag.label"
              clickable @click="properties[tag.name] = undefined"></q-chip>
    </q-card-section>
    <q-card-actions align="right">
      <q-btn class="c-cancel" color="primary" type="button" v-on:click="cancel" v-close-popup>Cancel</q-btn>
      <q-btn class="c-add" color="primary"
             :disable=" !canAdd"
             @click="addAsset">Add
        <template v-slot:loading>
          <q-spinner v-if="adding" /><q-spinner-grid v-else/>
        </template>
      </q-btn>
    </q-card-actions>
    <q-card-section>
      <div v-if="assetGainstrack"><pre>{{ assetGainstrack }}</pre></div>
      <div v-if="commandGainstrack"><pre>{{ commandGainstrack }}</pre></div>
      <div v-if="assetPrice">Price: <pre>{{ assetPrice }} {{baseCcy}}</pre></div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import FieldEditor from '../lib/assetdb/components/FieldEditor.vue';
import { createAssetFromProps, schemaFor, userAssetSchema } from 'src/lib/assetdb/AssetSchema';
import { AccountCommandDTO, AssetDTO } from 'src/lib/assetdb/models';
import { GlobalPricer } from 'src/lib/pricer';
import { LocalDate } from '@js-joda/core';
import { formatNumber } from 'src/lib/utils';
import { defaultedBalanceOrUnit, toGainstrack } from 'src/lib/commandDefaulting';
import { AllStateEx } from 'src/lib/AllStateEx';
import axios from 'axios';
import { FieldProperty, Schema } from 'src/lib/assetdb/schema';
import { useAppStore } from 'src/stores';
import { qnotify } from 'src/boot/notify';

const props = withDefaults(defineProps<{ accountId?: string; schema?: Schema }>(), {
  schema: () => userAssetSchema
});

const emit = defineEmits<{ ok: [asset: AssetDTO]; cancel: [] }>();

const store = useAppStore();

const properties = reactive<Record<string, any>>({ name: '', category: '' });
const adding = ref(false);

function onFieldUpdate(field: string, newValue: any) {
  properties[field] = newValue;
  if (newValue && schemaFor(field).fieldType === 'ticker') {
    store.loadQuotes(newValue);
  }
}

function onRemove(propType: FieldProperty) {
  delete properties[propType.name];
}

function addAsset() {
  const str = assetGainstrack.value;
  if (str) {
    axios.post('/api/post/asset', { str })
      .then(response => {
        qnotify.success(response.data);
        emit('ok', generatedAsset.value);
      })
      .catch(error => qnotify.error(error.response.data));
  }
}

function cancel() {
  emit('cancel');
}

const baseCcy = computed((): string => store.baseCcy);

const allStateEx = computed((): AllStateEx => store.allStateEx);

const globalPricer = computed((): GlobalPricer => store.fxConverter as GlobalPricer);

const schemas = computed((): FieldProperty[] => props.schema.selectedPropertiesForAsset(properties));

const availableTags = computed((): FieldProperty[] => props.schema.availablePropertiesForAsset(properties));

const generatedAsset = computed((): AssetDTO => createAssetFromProps(properties));

const generatedAssetCommand = computed((): AccountCommandDTO => ({
  ...generatedAsset.value,
  commandType: 'commodity',
  accountId: '',
  date: '1900-01-01',
}));

const assetPrice = computed((): string => {
  const asset = generatedAsset.value;
  const pricer = globalPricer.value;
  const ccy: string = baseCcy.value;
  const today = LocalDate.now();
  const price = pricer.getPrice(asset, ccy, today);
  return formatNumber(price);
});

const assetGainstrack = computed((): string => toGainstrack(generatedAssetCommand.value));

const commandGainstrack = computed((): string => {
  if (props.accountId) {
    const asset = generatedAsset.value;
    const today = properties['date'] || LocalDate.now();
    const cmd: AccountCommandDTO = {
      commandType: 'balunit',
      accountId: props.accountId,
      date: today.toString(),
      balance: { number: properties['units'] ?? 1, ccy: asset.asset },
    };
    if (properties['price']) {
      cmd.price = properties['price'];
    }
    const dcmd = defaultedBalanceOrUnit(cmd, allStateEx.value, globalPricer.value);
    return toGainstrack(dcmd);
  } else {
    return '';
  }
});

const canAdd = computed((): boolean => !!assetGainstrack.value);
</script>

<style scoped>

</style>
