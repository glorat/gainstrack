<template>
<!--        <div class="">-->
<!--            <button id="source-editor-submit" type="button" v-on:click="editorReset">Reset</button>-->
<!--            <button id="source-editor-reset" type="button" v-on:click="editorSave">Save</button>-->
<!--        </div>-->
    <my-page class="full-width column source-form">
<!--        <div >-->
            <div class="col-1">
                <button id="source-editor-submit" type="button" v-on:click="editorReset">Reset</button>
                <button id="source-editor-reset" type="button" v-on:click="editorSave">Save</button>
            </div>
            <div class="col-11 overflow-auto" >
                <codemirror v-model="info.source" :errors="errors" ></codemirror>
            </div>
<!--        </div>-->
    </my-page>
<!--    <form id="source-editor-form" class="source-form">-->
<!--        <q-page-sticky position="top">-->
<!--            <button id="source-editor-submit" type="button" v-on:click="editorReset">Reset</button>-->

<!--            <button id="source-editor-reset" type="button" v-on:click="editorSave">Save</button>-->
<!--        </q-page-sticky>-->
<!--        <codemirror v-model="info.source" :errors="errors"></codemirror>-->

<!--    </form>-->
</template>

<script setup lang="ts">
import axios from 'axios'
import { codemirror } from 'src/lib/loader'
import { useAppStore } from 'src/stores'
import { computed, reactive, onMounted } from 'vue'
import { axiosErrorMessage, qnotify } from 'src/boot/notify'
import type { ParseError } from 'src/lib/assetdb/models'

const store = useAppStore()
const info = reactive({ source: 'Loading...' })
const errors = computed(() => store.parseState.errors)

async function reload() {
  try {
    info.source = await store.fetchGainstrackText()
  } catch (error) {
    qnotify.error(String(error))
  }
}

function editorReset() {
  store.reload().then(() => reload())
}

function editorSave() {
  store.setGainstrackText(info.source)

  // Not logged in: compute AllState locally (TS generator), no backend round-trip.
  if (!store.isAuthenticated) {
    store.loadLocalText(info.source).then(res => {
      if (res.ok) {
        store.setParseState({ errors: [] })
        qnotify.success('Computed locally')
      } else {
        store.setParseState({ errors: res.errors })
        qnotify.warning('There are errors...')
      }
    })
    return
  }

  axios.post('/api/post/source', { source: info.source, filePath: '', entryHash: '', sha256sum: '' })
    .then(response => {
      const data = response.data as { errors: ParseError[] }
      store.setParseState(data)
      if (data.errors.length > 0) {
        qnotify.warning('There are errors...')
      } else {
        qnotify.success('Saved')
        store.reload().then(() => reload())
      }
    })
    .catch((error: unknown) => qnotify.error(axiosErrorMessage(error)))
}

onMounted(() => { void reload() })
</script>

<style>

    .source-editor-wrapper {
        position: absolute;
        top: 35px;
        right: 0;
        bottom: 0;
        left: 0;
    }

    .source-editor-wrapper .cm-editor {
        height: 100%;
        font: 13px monospace;
        border: 1px solid var(--color-sidebar-border);
    }

    .source-editor-wrapper .cm-scroller {
        overflow: auto;
    }

    .source-editor-wrapper .cm-gutters {
        background: var(--color-sidebar-background);
        border-right: 1px solid var(--color-sidebar-border);
    }


</style>
