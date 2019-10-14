<template>
    <form id="source-editor-form" class="source-form">
        <div class="fieldset">
            <ul class="dropdown">
                <li>Edit&nbsp;▾
                    <ul>
                        <li>
                            <button data-command="favaToggleComment" type="button" class="link">Toggle Comment (selection)</button>
                            <span>
                        <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>y</kbd>
                    </span>
                        </li>
                    </ul>
                </li>
            </ul>
            <button id="source-editor-submit" type="button" v-on:click="editorSave" data-progress-content="Saving..." title="Save (Ctrl/Cmd+s)">Save</button>
        </div>
        <codemirror v-model="info.source"></codemirror>

    </form>
</template>

<script>
    import axios from 'axios';
    import codemirror from '../components/CodeMirror.vue';

    export default {
        name: 'Editor',
        data() {
            return {info: {source: 'Loading...'}}
        },
        components: {codemirror},
        mounted() {
            const notify = this.$notify;
            axios.get('/api/editor/')
                .then(response => this.info = response.data)
                .catch(error => notify.error(error))
        },
        methods: {
            editorSave() {
                const notify = this.$notify;
                axios.put('/api/source/', {source: this.info.source, filePath: '', entryHash: '', sha256sum: ''})
                    .then(response => notify.success('Saved'))
                    .then(() => this.$store.dispatch('reload'))
                    .catch(error => notify.error(error.response.data || error))
            }
        }
    }
</script>

<style scoped>

</style>
