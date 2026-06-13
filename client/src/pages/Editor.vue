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

<script>
    import axios from 'axios';
    import {codemirror} from 'src/lib/loader';
    import {useAppStore} from 'src/stores';

    export default {
        name: 'Editor',
        setup() { return { store: useAppStore() } },
        data() {
            return {info: {source: 'Loading...'}}
        },
        components: {codemirror},
        mounted() {
            this.reload();
        },
        computed: {
            errors() {
                return this.store.parseState.errors;
            },
        },
        methods: {
            editorReset() {
                this.store.reload()
                    .then( () => this.reload());
            },
            editorSave() {
                this.store.setGainstrackText(this.info.source);
                const notify = this.$notify;

                // Not logged in: compute AllState locally (TS generator), no backend round-trip.
                if (!this.store.isAuthenticated) {
                    this.store.loadLocalText(this.info.source).then(res => {
                        if (res.ok) {
                            this.store.setParseState({ errors: [] });
                            notify.success('Computed locally');
                        } else {
                            this.store.setParseState({ errors: res.errors });
                            notify.warning('There are errors...');
                        }
                    });
                    return;
                }

                axios.post('/api/post/source', {source: this.info.source, filePath: '', entryHash: '', sha256sum: ''})
                    .then(response => {
                        this.store.setParseState(response.data);
                        if (response.data.errors.length > 0) {
                            notify.warning('There are errors...')
                        } else {
                            notify.success('Saved');
                            this.store.reload()
                                .then( () => this.reload());
                        }
                    })
                    .catch(error => notify.error( error.response || error))
            },
            reload() {
                const notify = this.$notify;
                this.store.fetchGainstrackText()
                    .then(source => this.info.source = source)
                    .catch(error => notify.error(error))
            },
          pageStyle(offset) {
            // "offset" is a Number (pixels) that refers to the total
            // height of header + footer that occupies on screen,
            // based on the QLayout "view" prop configuration

            // this is actually what the default style-fn does in Quasar
            return { minHeight: offset ? `calc(100vh - ${offset+40}px)` : '100vh' };
          }
        }
    }
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
