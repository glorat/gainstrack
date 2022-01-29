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
        @update:model-value="onFileInput"
      >
        <template v-slot:before>
          <q-icon :name="matCloudUpload" />
        </template>
      </q-file>
    </my-page>
</template>

<script lang="ts">
    import { matCloudUpload } from '@quasar/extras/material-icons';
    import {defineComponent} from 'vue';
    import axios from 'axios';

    export default defineComponent({
        name: 'Port',
      data() {
        return {
          matCloudUpload,
          file: undefined as undefined | File
        }
      },
        methods: {
          onFileInput() {
            const file = this.file;
            if (file) {
              this.beforeUpload(file);
            }
          },
            beforeUpload(file: File) {
                const notify = this.$notify;
                const store = this.$store;

                if (file.name.match(/\.gainstrack$/)) {
                    // console.log(`Trying to upload a ${file.type} of size ${file.size}`);
                    const reader = new FileReader();
                    reader.onload = () => {
                        const text = reader.result;
                        axios.post('/api/post/source', {source: text, filePath: '', entryHash: '', sha256sum: ''})
                            .then(response => {
                                store.dispatch('parseState', response.data);
                                if (response.data.errors.length > 0) {
                                    notify.warning('There are errors...');
                                    this.$router.push({name: 'errors'});
                                } else {
                                    notify.success('Saved');
                                    store.dispatch('reload');
                                    store.dispatch('gainstrackText'); // Clear editor
                                    // A bit of a hack to force a refresh of local state in current view
                                    this.$router.go(0);
                                }
                            });
                    };
                    reader.onerror = () => {
                        notify.error(reader.result as string);
                    };
                    reader.readAsText(file);
                } else {
                    notify.warning('Can only upload .gainstrack files');
                }
                return false;
            }
        }
    });
</script>

<style scoped>

</style>
