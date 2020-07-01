<template>
  <q-dialog ref="dialog" @hide="onDialogHide">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Edit Balance</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <command-editor :input="cmd"></command-editor>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Cancel" v-close-popup/>
        <q-btn flat label="Submit" v-close-popup/>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
  import Vue from 'vue';
  import {PropType} from '@vue/composition-api';
  import CommandEditor from 'components/CommandEditor.vue';
  import {AccountCommandDTO} from 'src/lib/models';
  import {QDialog} from 'quasar';

  export default Vue.extend({
    name: 'UnitEditorDialog',
    components: {CommandEditor},
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
    }
  })
</script>

<style scoped>

</style>
