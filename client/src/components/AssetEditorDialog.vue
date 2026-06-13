<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <asset-editor
      :asset-id="assetId"
      @cancel="onDialogHide"
      @ok="onOKClick"
    >
    </asset-editor>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar';
import AssetEditor from 'components/AssetEditor.vue';
import { AssetDTO } from 'src/lib/assetdb/models';

const props = defineProps<{ assetId?: string }>();
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

function onOKClick(asset: AssetDTO) {
  onDialogOK(asset);
}
</script>

<style scoped>

</style>
