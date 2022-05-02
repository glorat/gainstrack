<template>
    <div ref="container" class="vue-plotly"/>
</template>
<script>
    // Full bundle
    // import Plotly from 'plotly.js'
    // Partial bundle from full plotly.js
    // import Plotly from 'plotly.js/lib/index-basic'
    // Compiled partial bundle from plotly.js-basic-dist
    // import Plotly from 'plotly.js-basic-dist'
    // Preprared full dist
    import Plotly from 'plotly.js-dist'

    import debounce from 'lodash/debounce'
    import defaults from 'lodash/defaults'

    const events = [
        'click',
        'hover',
        'unhover',
        'selecting',
        'selected',
        'restyle',
        'relayout',
        'autosize',
        'deselect',
        'doubleclick',
        'redraw',
        'animated',
        'afterplot'
    ]

    const functions = [
        'restyle',
        'relayout',
        'update',
        'addTraces',
        'deleteTraces',
        'moveTraces',
        'extendTraces',
        'prependTraces',
        'purge'
    ]

    const methods = functions.reduce((all, funcName) => {
        all[funcName] = function(...args) {
            // eslint-disable-next-line
            return Plotly[funcName].apply(Plotly, [this.$refs.container].concat(args))
        }
        return all
    }, {})

    export default {
        props: {
            autoResize: Boolean,
            watchShallow: {
                type: Boolean,
                default() {
                    return false
                }
            },
            options: {
                type: Object
            },
            data: {
                type: Array
            },
            layout: {
                type: Object
            }
        },
        data() {
            return {
                internalLayout: {
                    ...this.layout,
                    datarevision: 1
                }
            }
        },
        mounted() {
            this.react()
            this.initEvents()

            this.$watch('data', () => {
                this.internalLayout.datarevision++
                this.react()
            }, { deep: !this.watchShallow })

            this.$watch('options', this.react, { deep: !this.watchShallow })
            this.$watch('layout', this.relayoutOnWatch, { deep: !this.watchShallow })
        },
        beforeUnmount() {
            window.removeEventListener('resize', this.__resizeListener)
            this.__generalListeners.forEach(obj => this.$refs.container.removeAllListeners(obj.fullName))
            Plotly.purge(this.$refs.container)
        },
        methods: {
          // The watch needs to be indirect or some infinite recursion happens on Vue 3
          relayoutOnWatch() {
            this.relayout();
          },
            initEvents() {
                // https://github.com/statnett/vue-plotly/issues/20
                if (this.autoResize) {
                    this.__resizeListener = debounce(() => {
                        this.internalLayout.datarevision++
                        this.react()
                    }, 200)
                    //
                    // this.__resizeListener = () => {
                    //     this.internalLayout.datarevision++
                    //     debounce(this.react, 200)
                    // }
                    window.addEventListener('resize', this.__resizeListener)
                }

                this.__generalListeners = events.map((eventName) => {
                    return {
                        fullName: 'plotly_' + eventName,
                        handler: (...args) => {
                            // eslint-disable-next-line
                            this.$emit.apply(this, [eventName].concat(args))
                        }
                    }
                })

                this.__generalListeners.forEach((obj) => {
                    this.$refs.container.on(obj.fullName, obj.handler)
                })
            },
            ...methods,
            toImage(options) {
                const el = this.$refs.container
                const opts = defaults(options, {
                    format: 'png',
                    width: el.clientWidth,
                    height: el.clientHeight
                })

                return Plotly.toImage(this.$refs.container, opts)
            },
            downloadImage(options) {
                const el = this.$refs.container
                const opts = defaults(options, {
                    format: 'png',
                    width: el.clientWidth,
                    height: el.clientHeight,
                    filename: (el.layout.title || 'plot') + ' - ' + new Date().toISOString()
                })

                return Plotly.downloadImage(this.$refs.container, opts)
            },
            plot() {
                return Plotly.plot(this.$refs.container, this.data, this.internalLayout, this.getOptions())
            },
            getOptions() {
                const el = this.$refs.container
                let opts = this.options

                // if width/height is not specified for toImageButton, default to el.clientWidth/clientHeight
                if (!opts) {
                    opts = {}
                }
                if (!opts.toImageButtonOptions) {
                    opts.toImageButtonOptions = {}
                }
                if (!opts.toImageButtonOptions.width) {
                    opts.toImageButtonOptions.width = el.clientWidth
                }
                if (!opts.toImageButtonOptions.height) {
                    opts.toImageButtonOptions.height = el.clientHeight
                }
                return opts
            },
            newPlot() {
                return Plotly.newPlot(this.$refs.container, this.data, this.internalLayout, this.getOptions())
            },
            react() {
                return Plotly.react(this.$refs.container, this.data, this.internalLayout, this.getOptions())
            }
        }
    }
</script>
<style>
</style>
