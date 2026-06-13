<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <add-cmd :modelValue="cmd" @cancel="onDialogHide" @command-added="onOKClick"
             title="Add/Edit Record"
             hide-journal
             has-cancel
             hide-changes
             :options="options"
    ></add-cmd>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { AccountCommandDTO } from 'src/lib/assetdb/models';
import AddCmd from 'pages/AddCmd.vue';

const props = defineProps<{ cmd?: AccountCommandDTO }>();
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

function onOKClick() {
  onDialogOK();
}

const options = computed(() => ({ hideAccount: true }));
</script>

<style scoped>

</style>
