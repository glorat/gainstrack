<template>
  <q-dialog ref="dialog" @hide="onDialogHide">
    <asset-editor
      :asset-id="assetId"
      @cancel="onDialogHide"
      @ok="onOKClick"
    >
    </asset-editor>
<!--    <add-cmd :input="cmd" @cancel="onDialogHide" @command-added="onOKClick"-->
<!--             title="Edit Balance"-->
<!--             hide-journal-->
<!--             has-cancel-->
<!--             hide-changes-->
<!--             :options="options"-->
<!--    ></add-cmd>-->
  </q-dialog>
</template>

<script lang="ts">
  import {defineComponent} from 'vue';

  import {QDialog} from 'quasar';
  import AssetEditor from 'components/AssetEditor.vue';
  import {AssetDTO} from 'src/lib/assetdb/models';

  export default defineComponent({
    name: 'AssetEditorDialog',
    components: {AssetEditor},
    props: {
      assetId: String
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
