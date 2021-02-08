<template>
  <q-dialog ref="dialog" @hide="onDialogHide" full-width full-height>
    <new-asset-editor
      :account-id="accountId"
      @cancel="onDialogHide"
      @ok="onOKClick"
    >
    </new-asset-editor>
  </q-dialog>
</template>

<script lang="ts">
import Vue from 'vue';

import {QDialog} from 'quasar';
import NewAssetEditor from 'components/NewAssetEditor.vue';
import {AssetDTO} from 'src/lib/assetdb/models';

export default Vue.extend({
  name: 'NewAssetDialog',
  components: {NewAssetEditor},
  props: {
    accountId: String
  },
  methods: {
    // following method is REQUIRED
    // (don't change its name --> "show")
    show() {
      const dialog = this.$refs.dialog as QDialog;
      dialog.show();
    },

    // following method is REQUIRED
    // (don't change its name --> "hide")
    hide() {
      const dialog = this.$refs.dialog as QDialog;
      dialog.hide()
    },

    onDialogHide() {
      // required to be emitted
      // when QDialog emits "hide" event
      this.$emit('hide')
    },

    onOKClick (asset:AssetDTO) {
      // on OK, it is REQUIRED to
      // emit "ok" event (with optional payload)
      // before hiding the QDialog
      this.$emit('ok', asset);
      // or with payload: this.$emit('ok', { ... })

      // then hiding dialog
      this.hide()
    },
  },
  computed: {
    options() {
      return {hideAccount:true};
    }
  }
})
</script>

<style scoped>

</style>
