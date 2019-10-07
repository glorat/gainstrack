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
    import codemirror from '../CodeMirror.vue';

    export default {
        name: "Editor",
        data () {return {info:{source:"Loading..."}}},
        components: {codemirror},
        mounted () {
            axios.get('/api/editor/')
                .then(response => this.info = response.data)
                .catch(error => console.log(error))
        },
        methods : {
            editorSave() {
                axios.put('/api/source/', {source : this.info.source, filePath: '', entryHash:'', sha256sum:''})
                    .then(response => console.log('Saved'))
            }
        }
    }
</script>

<style scoped>

</style>
