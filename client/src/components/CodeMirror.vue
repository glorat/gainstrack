<template>
    <div class="source-editor-wrapper">
        <textarea></textarea>
    </div>
</template>

<script>
    import CodeMirror from 'codemirror/lib/codemirror.js';
    import('codemirror/lib/codemirror.css');
    export default {
        name: 'codemirror',
        props: {
            value: {
                type: String,
                default: '',
            },
            options: {
                type: Object,
                default() {
                    return {
                        mode: 'text/javascript',
                        lineNumbers: true,
                        lineWrapping: true,
                    }
                }
            },
            errors: {
                type: Array,
                default() {
                    return [];
                }
            }
        },
        data() {
            return {
                skipNextChangeEvent: false,
                myMarks: [],
            }
        },
        ready() {
            const self = this;
            this.editor = CodeMirror.fromTextArea(this.$el.querySelector('textarea'), this.options);
            this.editor.setValue(this.value);
            this.editor.on('change', cm => {
                if (self.skipNextChangeEvent) {
                    self.skipNextChangeEvent = false;
                    return
                }
                self.value = cm.getValue();
                if (self.$emit) {
                    self.$emit('change', cm.getValue())
                }
            })
        },
        mounted() {
            const self = this;
            this.editor = CodeMirror.fromTextArea(this.$el.querySelector('textarea'), this.options);
            this.editor.setValue(this.value);
            this.editor.on('change', (cm) => {
                if (self.skipNextChangeEvent) {
                    self.skipNextChangeEvent = false;
                    return
                }
                if (self.$emit) {
                    self.$emit('change', cm.getValue());
                    self.$emit('input', cm.getValue())
                }
            })
        },
        watch: {
            value(newVal, oldVal) {
                const editorValue = this.editor.getValue();
                if (newVal !== editorValue) {
                    this.skipNextChangeEvent = true;
                    const scrollInfo = this.editor.getScrollInfo();
                    this.editor.setValue(newVal);
                    this.editor.scrollTo(scrollInfo.left, scrollInfo.top)
                }
            },
            options(newOptions, oldVal) {
                if (typeof newOptions === 'object') {
                    for (const optionName in newOptions) {
                        if (newOptions.hasOwnProperty(optionName)) {
                            this.editor.setOption(optionName, newOptions[optionName])
                        }
                    }
                }
            },
            errors(newErrors) {
                this.myMarks.forEach(mark => mark.clear());

                this.errors.forEach(err => {
                    const line = err.line;
                    const from = {line: line - 1, ch: 0};
                    const to = {line: line + 0, ch: 0};
                    // .getDoc()
                    this.myMarks.push(this.editor.markText(from, to, {css: 'background-color: yellow'}));
                })

            }
        },
        beforeDestroy() {
            if (this.editor) {
                this.editor.toTextArea()
            }
        }
    }
</script>

<style scoped>

</style>
