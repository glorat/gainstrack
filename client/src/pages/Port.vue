<template>
    <my-page padding>
        Your data can be exported and saved to your local computer in Gainstrack format - a simple text based format
        <ul>
            <li><a href="#" @click.prevent="exportGainstrack">Export Gainstrack...</a></li>
        </ul>
        Your data can also be exported to Beancount format - a popular open source text based accounting software package
        <ul>
            <li><a href="#" @click.prevent="exportBeancount">Export Beancount...</a></li>
        </ul>

        You can also migrate a ledger in from Beancount. It is loaded by beancount itself in your
        browser, and the result is checked back against beancount before you keep anything
        <ul>
            <li><router-link to="/port/beancount">Import from Beancount...</router-link></li>
        </ul>

        If you have exported your Gainstrack file, you can re-upload and apply it here
      <q-file
        v-model="file"
        label="Drop file here or click to upload"
        filled
        @update:modelValue="onFileInput"
      >
        <template v-slot:before>
          <q-icon :name="matCloudUpload" />
        </template>
      </q-file>
    </my-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {matCloudUpload} from '@quasar/extras/material-icons';
import {useAppStore} from 'src/stores';
import {useRouter} from 'vue-router';
import {qnotify} from 'src/boot/notify';
import {GainstrackParser} from 'src/lib/GainstrackParser';
import {toGainstrackFile} from 'src/lib/export/gainstrackExport';
import {toBeancountFile} from 'src/lib/export/beancountExport';
import {downloadText} from 'src/lib/export/download';

const store = useAppStore();
const router = useRouter();
const file = ref<File | undefined>(undefined);

/**
 * Both exports are generated in the browser from the ledger already in memory.
 *
 * They used to be <a href="/api/export/*"> links into Scala. Those broke once the ledger moved
 * to Firestore: a plain navigation carries no Authorization header, so the server saw an
 * anonymous request and served the starter sample — a plausible-looking file containing
 * someone else's accounts. Generating locally removes the whole class of problem.
 */
async function exportGainstrack() {
  const parser = new GainstrackParser();
  parser.parseString(await store.fetchGainstrackText());
  downloadText('mydata.gainstrack', toGainstrackFile(parser.getTypedCommands()));
}

async function exportBeancount() {
  downloadText('mydata.beancount', toBeancountFile(await store.fetchGainstrackText()));
}

function onFileInput() {
  if (file.value) {
    beforeUpload(file.value);
  }
}

function beforeUpload(uploadFile: File) {
  if (uploadFile.name.match(/\.gainstrack$/)) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      // Anonymous users have no ledger to persist to — compute locally, as the editor does.
      const save = store.canPersist
        ? store.saveSource(text as string)
        : store.loadLocalText(text as string).then(r => ({ errors: r.errors }));
      save
        .then(response => {
          store.setParseState(response);
          if (response.errors.length > 0) {
            qnotify.warning('There are errors...');
            router.push({name: 'errors'});
          } else {
            qnotify.success('Saved');
            // An anonymous import exists only in memory: reloading would throw it away and
            // re-seed the sample, so only signed-in users refresh from the ledger.
            if (store.canPersist) {
              store.reload();
              store.fetchGainstrackText();
              router.go(0);
            } else {
              router.push('/');
            }
          }
        });
    };
    reader.onerror = () => {
      qnotify.error(reader.result as string);
    };
    reader.readAsText(uploadFile);
  } else {
    qnotify.warning('Can only upload .gainstrack files');
  }
}
</script>

<style scoped>

</style>
