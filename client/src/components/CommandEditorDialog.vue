<template>
  <q-dialog ref="dialog" @hide="onDialogHide">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Edit Balance</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
<!--        <command-editor :input="cmd" v-on:gainstrack-changed="onGainstrackChanged"></command-editor>-->
        <add-cmd :input="cmd" @cancel="onDialogHide" @command-added="onOKClick" ></add-cmd>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Cancel" v-close-popup/>
        <q-btn flat label="Submit" @click="onOKClick" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {PropType} from '@vue/composition-api';
  import {AccountCommandDTO} from 'src/lib/models';
  import {QDialog} from 'quasar';
  import AddCmd from 'pages/AddCmd.vue';

  export default Vue.extend({
    name: 'CommandEditorDialog',
    components: {AddCmd},
    props: {
      cmd: Object as PropType<AccountCommandDTO>
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

      onOKClick () {
        // on OK, it is REQUIRED to
        // emit "ok" event (with optional payload)
        // before hiding the QDialog
        this.$emit('ok', this.$data);
        // or with payload: this.$emit('ok', { ... })

        // then hiding dialog
        this.hide()
      },
    }
  })
</script>

<style scoped>

</style>
