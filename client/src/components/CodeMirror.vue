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
            modelValue: {
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
            value: this.modelValue,
            skipNextChangeEvent: false,
            myMarks: [],
          }
        },
        ready() {
            this.editor = CodeMirror.fromTextArea(this.$el.querySelector('textarea'), this.options);
            this.editor.setValue(this.value);
            this.editor.on('change', cm => {
                if (this.skipNextChangeEvent) {
                  this.skipNextChangeEvent = false;
                    return
                }
              this.value = cm.getValue();
                if (this.$emit) {
                  this.$emit('change', this.value)
                  this.$emit('update:modelValue', this.value)
                }
            });
        },
        mounted() {
            this.editor = CodeMirror.fromTextArea(this.$el.querySelector('textarea'), this.options);
            this.editor.setValue(this.value);
            this.editor.on('change', (cm) => {
                if (this.skipNextChangeEvent) {
                  this.skipNextChangeEvent = false;
                    return
                }
                if (this.$emit) {
                  this.$emit('change', cm.getValue());
                  this.$emit('input', cm.getValue())
                }
            });
        },
        watch: {
            modelValue(newVal) {
                const editorValue = this.editor.getValue();
                if (newVal !== editorValue) {
                    this.skipNextChangeEvent = true;
                    this.editor.setValue(newVal);
                    // Scroll to specific line if specified, otherwise to previous position
                    if (this.$route.query.line > 0) {
                        const t = this.editor.charCoords({line: this.$route.query.line, ch: 0}, 'local').top;
                        const middleHeight = this.editor.getScrollerElement().offsetHeight / 2;
                        this.editor.scrollTo(null, t - middleHeight - 5);

                        // this.editor.scrollIntoView({line: this.$route.query.line, ch: 0});
                    } else {
                        const scrollInfo = this.editor.getScrollInfo();
                        this.editor.scrollTo(scrollInfo.left, scrollInfo.top)
                    }
                    this.applyErrors(this.errors);
                }
            },
            options(newOptions) {
                if (typeof newOptions === 'object') {
                    for (const optionName in newOptions) {
                        // eslint-disable-next-line no-prototype-builtins
                        if (newOptions.hasOwnProperty(optionName)) {
                            this.editor.setOption(optionName, newOptions[optionName])
                        }
                    }
                }
            },
            errors(newErrors) {
                this.applyErrors(newErrors)
            }
        },
        methods: {
            applyErrors(newErrors) {
                this.myMarks.forEach(mark => mark.clear());

                newErrors.forEach(err => {
                    const line = err.line;
                    const from = {line: line - 1, ch: 0};
                    const to = {line: line + 0, ch: 0};
                    // .getDoc()
                    this.myMarks.push(this.editor.markText(from, to, {css: 'background-color: yellow'}));
                })
            },
        },
        beforeUnmount() {
            if (this.editor) {
                this.editor.toTextArea()
            }
        }
    }
</script>

<style scoped>

</style>
