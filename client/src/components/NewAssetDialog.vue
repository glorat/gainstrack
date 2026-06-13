<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" full-width full-height>
    <new-asset-editor
      :account-id="accountId"
      @cancel="onDialogHide"
      @ok="onOKClick"
    >
    </new-asset-editor>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar';
import NewAssetEditor from 'components/NewAssetEditor.vue';
import { AssetDTO } from 'src/lib/assetdb/models';

const props = defineProps<{ accountId?: string }>();
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

function onOKClick(asset: AssetDTO) {
  onDialogOK(asset);
}
</script>

<style scoped>

</style>
