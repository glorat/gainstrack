<template>
  <q-dialog ref="dialog" @hide="onDialogHide">
    <add-cmd :modelValue="cmd" @cancel="onDialogHide" @command-added="onOKClick"
             title="Add/Edit Record"
             hide-journal
             has-cancel
             hide-changes
             :options="options"
    ></add-cmd>
  </q-dialog>
</template>

<script lang="ts">
  import {defineComponent} from 'vue';
  import {PropType} from 'vue';
  import {AccountCommandDTO} from 'src/lib/assetdb/models';
  import {QDialog} from 'quasar';
  import AddCmd from 'pages/AddCmd.vue';

  export default defineComponent({
    name: 'CommandEditorDialog',
    components: {AddCmd},
    props: {
      cmd: Object as PropType<AccountCommandDTO>
    },
    emits: ['ok', 'hide'],
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

      onOKClick () {
        // on OK, it is REQUIRED to
        // emit "ok" event (with optional payload)
        // before hiding the QDialog
        this.$emit('ok', this.$data);
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
