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

    export default {
        name: 'Editor',
        data() {
            return {info: {source: 'Loading...'}}
        },
        components: {codemirror},
        mounted() {
            this.reload();
        },
        computed: {
            errors() {
                return this.$store.state.parseState.errors;
            },
        },
        methods: {
            editorReset() {
                this.$store.dispatch('reload')
                    .then( () => this.reload());
            },
            editorSave() {
                this.$store.commit('gainstrackText', this.info.source);
                const notify = this.$notify;
                axios.post('/api/post/source', {source: this.info.source, filePath: '', entryHash: '', sha256sum: ''})
                    .then(response => {
                        this.$store.dispatch('parseState', response.data);
                        if (response.data.errors.length > 0) {
                            notify.warning('There are errors...')
                        } else {
                            notify.success('Saved');
                            this.$store.dispatch('reload')
                                .then( () => this.reload());
                        }
                    })
                    .catch(error => notify.error( error.response || error))
            },
            reload() {
                const notify = this.$notify;
                this.$store.dispatch('gainstrackText')
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

    :root {
        --source-editor-fieldset-height: 44px;
    }

    /*.source-editor-wrapper {*/
    /*    position: fixed;*/
    /*    top: calc(var(--header-height) + var(--source-editor-fieldset-height));*/
    /*    right: 0;*/
    /*    bottom: 0;*/
    /*    left: var(--aside-width);*/
    /*}*/

    .source-editor-wrapper {
        position: absolute;
        top: 35px;
        right: 0;
        bottom: 0;
        left: 0;
        height: 100%;
    }

    .dropdown {
        display: flex;
        height: 100%;
        margin: 0;
    }

    .dropdown .selected::before {
        content: "›";
    }

    .dropdown > li {
        position: relative;
        height: var(--source-editor-fieldset-height);
        margin-right: 10px;
        line-height: var(--source-editor-fieldset-height);
        cursor: default;
    }

    .dropdown button {
        color: inherit;
    }

    .dropdown > li > ul {
        position: absolute;
        top: var(--source-editor-fieldset-height);
        z-index: var(--z-index-floating-ui);
        display: none;
        width: 500px;
        max-height: 400px;
        margin-left: -10px;
        overflow-y: auto;
        line-height: 1.5;
        background-color: var(--color-background);
        border: 1px solid var(--color-background-darker);
        border-bottom-right-radius: 3px;
        border-bottom-left-radius: 3px;
        box-shadow: 0 3px 6px var(--color-transparent-black);
    }

    .dropdown > li > ul > li {
        padding: 2px 10px;
    }

    .dropdown > li > ul > li span {
        float: right;
    }

    .dropdown li:hover > ul {
        display: block;
    }


    .CodeMirror-gutters {
        background: var(--color-sidebar-background);
        border-right: 1px solid var(--color-sidebar-border);
    }

    .CodeMirror.CodeMirror {
        margin-bottom: 1em;
        font: 13px var(--font-family-editor);
        border: 1px solid var(--color-sidebar-border);
    }

    /*.source-form {*/
    /*    position: fixed;*/
    /*    top: var(--header-height);*/
    /*    right: 0;*/
    /*    bottom: 0;*/
    /*    left: var(--aside-width);*/
    /*    background: var(--color-sidebar-background);*/
    /*}*/

    .source-form .fieldset {
        height: var(--source-editor-fieldset-height);
        padding-left: 0.5em;
        border-bottom: 1px solid var(--color-sidebar-border);
    }

    .source-form .fieldset > button {
        margin: 0;
    }

    .source-form .CodeMirror-lines {
        border-top: 1px solid var(--color-sidebar-border);
    }

    .source-form .CodeMirror,
    .source-form textarea {
        width: 100%;
        height: 100%;
        margin: 0;
        border: 0;
    }

    .source-slice-editor-form .CodeMirror {
        height: auto;
    }

    .cm-trailingspace {
        background-color: var(--color-editor-trailing-whitespace);
    }

    .cm-section {
        padding-right: 10px;
        font-weight: 500;
        color: var(--color-editor-comment);
        border: solid 1px var(--color-editor-comment);
        border-radius: 2px;
    }

    .cm-comment {
        color: var(--color-editor-comment);
    }

    .cm-date {
        color: var(--color-editor-date);
    }

    .cm-directive {
        font-weight: 500;
        color: var(--color-editor-directive);
    }

    .cm-option {
        color: var(--color-editor-class);
    }

    .cm-account {
        color: var(--color-editor-account);
    }

    .cm-invalid {
        color: var(--color-editor-invalid);
    }

    .CodeMirror-hint {
        max-width: 600px;
    }

    .CodeMirror-hint .highlight {
        font-weight: 500;
    }

    /* BASICS */

    .CodeMirror {
        /* Set height, width, borders, and global font properties here */
        font-family: monospace;
        height: 300px;
        color: black;
        direction: ltr;
    }

    /* PADDING */

    .CodeMirror-lines {
        padding: 4px 0; /* Vertical padding around content */
    }
    .CodeMirror pre.CodeMirror-line,
    .CodeMirror pre.CodeMirror-line-like {
        padding: 0 4px; /* Horizontal padding of content */
    }

    .CodeMirror-scrollbar-filler, .CodeMirror-gutter-filler {
        background-color: white; /* The little square between H and V scrollbars */
    }

    /* GUTTER */

    .CodeMirror-gutters {
        border-right: 1px solid #ddd;
        background-color: #f7f7f7;
        white-space: nowrap;
    }
    .CodeMirror-linenumbers {}
    .CodeMirror-linenumber {
        padding: 0 3px 0 5px;
        min-width: 20px;
        text-align: right;
        color: #999;
        white-space: nowrap;
    }

    .CodeMirror-guttermarker { color: black; }
    .CodeMirror-guttermarker-subtle { color: #999; }

    /* CURSOR */

    .CodeMirror-cursor {
        border-left: 1px solid black;
        border-right: none;
        width: 0;
    }
    /* Shown when moving in bi-directional text */
    .CodeMirror div.CodeMirror-secondarycursor {
        border-left: 1px solid silver;
    }
    .cm-fat-cursor .CodeMirror-cursor {
        width: auto;
        border: 0 !important;
        background: #7e7;
    }
    .cm-fat-cursor div.CodeMirror-cursors {
        z-index: 1;
    }
    .cm-fat-cursor-mark {
        background-color: rgba(20, 255, 20, 0.5);
        -webkit-animation: blink 1.06s steps(1) infinite;
        -moz-animation: blink 1.06s steps(1) infinite;
        animation: blink 1.06s steps(1) infinite;
    }
    .cm-animate-fat-cursor {
        width: auto;
        border: 0;
        -webkit-animation: blink 1.06s steps(1) infinite;
        -moz-animation: blink 1.06s steps(1) infinite;
        animation: blink 1.06s steps(1) infinite;
        background-color: #7e7;
    }
    @-moz-keyframes blink {
        0% {}
        50% { background-color: transparent; }
        100% {}
    }
    @-webkit-keyframes blink {
        0% {}
        50% { background-color: transparent; }
        100% {}
    }
    @keyframes blink {
        0% {}
        50% { background-color: transparent; }
        100% {}
    }

    /* Can style cursor different in overwrite (non-insert) mode */
    .CodeMirror-overwrite .CodeMirror-cursor {}

    .cm-tab { display: inline-block; text-decoration: inherit; }

    .CodeMirror-rulers {
        position: absolute;
        left: 0; right: 0; top: -50px; bottom: 0;
        overflow: hidden;
    }
    .CodeMirror-ruler {
        border-left: 1px solid #ccc;
        top: 0; bottom: 0;
        position: absolute;
    }

    /* DEFAULT THEME */

    .cm-s-default .cm-header {color: blue;}
    .cm-s-default .cm-quote {color: #090;}
    .cm-negative {color: #d44;}
    .cm-positive {color: #292;}
    .cm-header, .cm-strong {font-weight: bold;}
    .cm-em {font-style: italic;}
    .cm-link {text-decoration: underline;}
    .cm-strikethrough {text-decoration: line-through;}

    .cm-s-default .cm-keyword {color: #708;}
    .cm-s-default .cm-atom {color: #219;}
    .cm-s-default .cm-number {color: #164;}
    .cm-s-default .cm-def {color: #00f;}
    .cm-s-default .cm-variable,
    .cm-s-default .cm-punctuation,
    .cm-s-default .cm-property,
    .cm-s-default .cm-operator {}
    .cm-s-default .cm-variable-2 {color: #05a;}
    .cm-s-default .cm-variable-3, .cm-s-default .cm-type {color: #085;}
    .cm-s-default .cm-comment {color: #a50;}
    .cm-s-default .cm-string {color: #a11;}
    .cm-s-default .cm-string-2 {color: #f50;}
    .cm-s-default .cm-meta {color: #555;}
    .cm-s-default .cm-qualifier {color: #555;}
    .cm-s-default .cm-builtin {color: #30a;}
    .cm-s-default .cm-bracket {color: #997;}
    .cm-s-default .cm-tag {color: #170;}
    .cm-s-default .cm-attribute {color: #00c;}
    .cm-s-default .cm-hr {color: #999;}
    .cm-s-default .cm-link {color: #00c;}

    .cm-s-default .cm-error {color: #f00;}
    .cm-invalidchar {color: #f00;}

    .CodeMirror-composing { border-bottom: 2px solid; }

    /* Default styles for common addons */

    div.CodeMirror span.CodeMirror-matchingbracket {color: #0b0;}
    div.CodeMirror span.CodeMirror-nonmatchingbracket {color: #a22;}
    .CodeMirror-matchingtag { background: rgba(255, 150, 0, .3); }
    .CodeMirror-activeline-background {background: #e8f2ff;}

    /* STOP */

    /* The rest of this file contains styles related to the mechanics of
       the editor. You probably shouldn't touch them. */

    .CodeMirror {
        position: relative;
        overflow: hidden;
        background: white;
    }

    .CodeMirror-scroll {
        overflow: scroll !important; /* Things will break if this is overridden */
        /* 30px is the magic margin used to hide the element's real scrollbars */
        /* See overflow: hidden in .CodeMirror */
        margin-bottom: -30px; margin-right: -30px;
        padding-bottom: 30px;
        height: 100%;
        outline: none; /* Prevent dragging from highlighting the element */
        position: relative;
    }
    .CodeMirror-sizer {
        position: relative;
        border-right: 30px solid transparent;
    }

    /* The fake, visible scrollbars. Used to force redraw during scrolling
       before actual scrolling happens, thus preventing shaking and
       flickering artifacts. */
    .CodeMirror-vscrollbar, .CodeMirror-hscrollbar, .CodeMirror-scrollbar-filler, .CodeMirror-gutter-filler {
        position: absolute;
        z-index: 6;
        display: none;
    }
    .CodeMirror-vscrollbar {
        right: 0; top: 0;
        overflow-x: hidden;
        overflow-y: scroll;
    }
    .CodeMirror-hscrollbar {
        bottom: 0; left: 0;
        overflow-y: hidden;
        overflow-x: scroll;
    }
    .CodeMirror-scrollbar-filler {
        right: 0; bottom: 0;
    }
    .CodeMirror-gutter-filler {
        left: 0; bottom: 0;
    }

    .CodeMirror-gutters {
        position: absolute; left: 0; top: 0;
        min-height: 100%;
        z-index: 3;
    }
    .CodeMirror-gutter {
        white-space: normal;
        height: 100%;
        display: inline-block;
        vertical-align: top;
        margin-bottom: -30px;
    }
    .CodeMirror-gutter-wrapper {
        position: absolute;
        z-index: 4;
        background: none !important;
        border: none !important;
    }
    .CodeMirror-gutter-background {
        position: absolute;
        top: 0; bottom: 0;
        z-index: 4;
    }
    .CodeMirror-gutter-elt {
        position: absolute;
        cursor: default;
        z-index: 4;
    }
    .CodeMirror-gutter-wrapper ::selection { background-color: transparent }
    .CodeMirror-gutter-wrapper ::-moz-selection { background-color: transparent }

    .CodeMirror-lines {
        cursor: text;
        min-height: 1px; /* prevents collapsing before first draw */
    }
    .CodeMirror pre.CodeMirror-line,
    .CodeMirror pre.CodeMirror-line-like {
        /* Reset some styles that the rest of the page might have set */
        -moz-border-radius: 0; -webkit-border-radius: 0; border-radius: 0;
        border-width: 0;
        background: transparent;
        font-family: inherit;
        font-size: inherit;
        margin: 0;
        white-space: pre;
        word-wrap: normal;
        line-height: inherit;
        color: inherit;
        z-index: 2;
        position: relative;
        overflow: visible;
        -webkit-tap-highlight-color: transparent;
        -webkit-font-variant-ligatures: contextual;
        font-variant-ligatures: contextual;
    }
    .CodeMirror-wrap pre.CodeMirror-line,
    .CodeMirror-wrap pre.CodeMirror-line-like {
        word-wrap: break-word;
        white-space: pre-wrap;
        word-break: normal;
    }

    .CodeMirror-linebackground {
        position: absolute;
        left: 0; right: 0; top: 0; bottom: 0;
        z-index: 0;
    }

    .CodeMirror-linewidget {
        position: relative;
        z-index: 2;
        padding: 0.1px; /* Force widget margins to stay inside of the container */
    }

    .CodeMirror-widget {}

    .CodeMirror-rtl pre { direction: rtl; }

    .CodeMirror-code {
        outline: none;
    }

    /* Force content-box sizing for the elements where we expect it */
    .CodeMirror-scroll,
    .CodeMirror-sizer,
    .CodeMirror-gutter,
    .CodeMirror-gutters,
    .CodeMirror-linenumber {
        -moz-box-sizing: content-box;
        box-sizing: content-box;
    }

    .CodeMirror-measure {
        position: absolute;
        width: 100%;
        height: 0;
        overflow: hidden;
        visibility: hidden;
    }

    .CodeMirror-cursor {
        position: absolute;
        pointer-events: none;
    }
    .CodeMirror-measure pre { position: static; }

    div.CodeMirror-cursors {
        visibility: hidden;
        position: relative;
        z-index: 3;
    }
    div.CodeMirror-dragcursors {
        visibility: visible;
    }

    .CodeMirror-focused div.CodeMirror-cursors {
        visibility: visible;
    }

    .CodeMirror-selected { background: #d9d9d9; }
    .CodeMirror-focused .CodeMirror-selected { background: #d7d4f0; }
    .CodeMirror-crosshair { cursor: crosshair; }
    .CodeMirror-line::selection, .CodeMirror-line > span::selection, .CodeMirror-line > span > span::selection { background: #d7d4f0; }
    .CodeMirror-line::-moz-selection, .CodeMirror-line > span::-moz-selection, .CodeMirror-line > span > span::-moz-selection { background: #d7d4f0; }

    .cm-searching {
        background-color: #ffa;
        background-color: rgba(255, 255, 0, .4);
    }

    /* Used to force a border model for a node */
    .cm-force-border { padding-right: .1px; }

    @media print {
        /* Hide the cursor when printing */
        .CodeMirror div.CodeMirror-cursors {
            visibility: hidden;
        }
    }

    /* See issue #2901 */
    .cm-tab-wrap-hack:after { content: ''; }

    /* Help users use markselection to safely style text background */
    span.CodeMirror-selectedtext { background: none; }
    .CodeMirror-dialog {
        position: absolute;
        left: 0; right: 0;
        background: inherit;
        z-index: 15;
        padding: .1em .8em;
        overflow: hidden;
        color: inherit;
    }

    .CodeMirror-dialog-top {
        border-bottom: 1px solid #eee;
        top: 0;
    }

    .CodeMirror-dialog-bottom {
        border-top: 1px solid #eee;
        bottom: 0;
    }

    .CodeMirror-dialog input {
        border: none;
        outline: none;
        background: transparent;
        width: 20em;
        color: inherit;
        font-family: monospace;
    }

    .CodeMirror-dialog button {
        font-size: 70%;
    }
    .CodeMirror-foldmarker {
        color: blue;
        text-shadow: #b9f 1px 1px 2px, #b9f -1px -1px 2px, #b9f 1px -1px 2px, #b9f -1px 1px 2px;
        font-family: arial;
        line-height: .3;
        cursor: pointer;
    }
    .CodeMirror-foldgutter {
        width: .7em;
    }
    .CodeMirror-foldgutter-open,
    .CodeMirror-foldgutter-folded {
        cursor: pointer;
    }
    .CodeMirror-foldgutter-open:after {
        content: "\25BE";
    }
    .CodeMirror-foldgutter-folded:after {
        content: "\25B8";
    }
    .CodeMirror-hints {
        position: absolute;
        z-index: 10;
        overflow: hidden;
        list-style: none;

        margin: 0;
        padding: 2px;

        -webkit-box-shadow: 2px 3px 5px rgba(0,0,0,.2);
        -moz-box-shadow: 2px 3px 5px rgba(0,0,0,.2);
        box-shadow: 2px 3px 5px rgba(0,0,0,.2);
        border-radius: 3px;
        border: 1px solid silver;

        background: white;
        font-size: 90%;
        font-family: monospace;

        max-height: 20em;
        overflow-y: auto;
    }

    .CodeMirror-hint {
        margin: 0;
        padding: 0 4px;
        border-radius: 2px;
        white-space: pre;
        color: black;
        cursor: pointer;
    }

    li.CodeMirror-hint-active {
        background: #08f;
        color: white;
    }

</style>
