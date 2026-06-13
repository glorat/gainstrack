<template>
    <my-page padding>
        Your data can be exported and saved to your local computer in Gainstrack format - a simple text based format
        <ul>
            <li><a href="/api/export/gainstrack">Export Gainstrack...</a></li>
        </ul>
        Your data can also be exported to Beancount format - a popular open source text based accounting software package
        <ul>
            <li><a href="/api/export/beancount">Export Beancount...</a></li>
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
import axios from 'axios';
import {useAppStore} from 'src/stores';
import {useRouter} from 'vue-router';
import {qnotify} from 'src/boot/notify';

const store = useAppStore();
const router = useRouter();
const file = ref<File | undefined>(undefined);

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
      axios.post('/api/post/source', {source: text, filePath: '', entryHash: '', sha256sum: ''})
        .then(response => {
          store.setParseState(response.data);
          if (response.data.errors.length > 0) {
            qnotify.warning('There are errors...');
            router.push({name: 'errors'});
          } else {
            qnotify.success('Saved');
            store.reload();
            store.fetchGainstrackText();
            router.go(0);
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
