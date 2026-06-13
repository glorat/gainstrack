<template>
  <q-card>
    <q-card-section>
      <asset-id :modelValue="assetId"></asset-id>
      <q-input v-for="opt in assetOptions" :key="opt" :label="opt" v-model="asset.options[opt]"></q-input>
      <q-card-section>
        <pre>{{ asGainstrack }}</pre>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn class="c-cancel" color="primary" type="button" v-on:click="cancel">Cancel</q-btn>
        <q-btn class="c-add" color="primary" @click="onSubmit" :disable="upserting" :loading="upserting">
          Submit
          <template v-slot:loading>
            <q-spinner />
          </template>
        </q-btn>
      </q-card-actions>

    </q-card-section>
  </q-card>

</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import AssetId from '../lib/assetdb/components/AssetId.vue';
import {AssetDTO} from '../lib/assetdb/models';
import {useAppStore} from 'src/stores';
import {keys, cloneDeep} from 'lodash';
import {toCommodityGainstrack} from 'src/lib/commandDefaulting';
import {qnotify} from 'src/boot/notify';

const props = defineProps<{ assetId?: string }>();
const emit = defineEmits<{
  'ok': [asset: AssetDTO]
  'cancel': []
}>();

const store = useAppStore();

const asset = ref<AssetDTO>({asset: props.assetId, options: {}} as AssetDTO);
const upserting = ref(false);

function originalAssetFor(assetId: string | undefined) {
  return store.allState.assetState.find(x => x.asset === assetId);
}

async function onSubmit() {
  try {
    upserting.value = true;
    await store.upsertAsset(asset.value);
    emit('ok', asset.value);
  } catch (error) {
    qnotify.error('Failed to add/update asset');
    console.log(error);
  } finally {
    upserting.value = false;
  }
}

function cancel() {
  emit('cancel');
}

const originalAsset = computed((): AssetDTO | undefined => originalAssetFor(props.assetId));
const assetOptions = computed((): string[] => keys(asset.value?.options ?? []).filter(k => !!asset.value?.options[k]).sort());
const asGainstrack = computed((): string => toCommodityGainstrack(asset.value));

watch(originalAsset, newVal => {
  if (newVal) asset.value = cloneDeep(newVal);
});

onMounted(() => {
  if (originalAsset.value) {
    asset.value = cloneDeep(originalAsset.value);
  }
});
</script>

<style scoped>

</style>
