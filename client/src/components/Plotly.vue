<template>
    <div ref="container" class="vue-plotly"/>
</template>
<script lang="ts">
import Plotly from 'plotly.js-dist'
import debounce from 'lodash/debounce'
import defaults from 'lodash/defaults'
import { defineComponent } from 'vue'

const events = [
  'click', 'hover', 'unhover', 'selecting', 'selected', 'restyle', 'relayout',
  'autosize', 'deselect', 'doubleclick', 'redraw', 'animated', 'afterplot'
]

const functions = [
  'restyle', 'relayout', 'update', 'addTraces', 'deleteTraces',
  'moveTraces', 'extendTraces', 'prependTraces', 'purge'
]

interface GeneralListener {
  fullName: string
  handler: (...args: unknown[]) => void
}

// Generates passthrough methods for the Plotly API functions listed above.
const passthroughMethods = functions.reduce<Record<string, (...args: unknown[]) => unknown>>((all, funcName) => {
  all[funcName] = function(this: { $refs: { container: HTMLElement } }, ...args: unknown[]) {
    return Plotly[funcName].apply(Plotly, [this.$refs.container, ...args])
  }
  return all
}, {})

export default defineComponent({
  props: {
    autoResize: Boolean,
    watchShallow: { type: Boolean, default: false },
    options: { type: Object },
    data: { type: Array },
    layout: { type: Object }
  },
  data() {
    return {
      internalLayout: { ...this.layout, datarevision: 1 } as Record<string, unknown>,
      resizeListenerFn: null as ((...args: unknown[]) => void) | null,
      generalListeners: [] as GeneralListener[],
    }
  },
  mounted() {
    this.react()
    this.initEvents()
    this.$watch('data', () => {
      this.internalLayout['datarevision'] = (this.internalLayout['datarevision'] as number) + 1
      this.react()
    }, { deep: !this.watchShallow })
    this.$watch('options', this.react, { deep: !this.watchShallow })
    this.$watch('layout', this.relayoutOnWatch, { deep: !this.watchShallow })
  },
  beforeUnmount() {
    if (this.resizeListenerFn) window.removeEventListener('resize', this.resizeListenerFn)
    const container = this.$refs['container'] as HTMLElement & { removeAllListeners?: (name: string) => void }
    this.generalListeners.forEach(obj => container.removeAllListeners?.(obj.fullName))
    Plotly.purge(container)
  },
  methods: {
    relayoutOnWatch() {
      Plotly.relayout(this.$refs['container'] as HTMLElement)
    },
    initEvents() {
      if (this.autoResize) {
        this.resizeListenerFn = debounce(() => {
          this.internalLayout['datarevision'] = (this.internalLayout['datarevision'] as number) + 1
          this.react()
        }, 200)
        window.addEventListener('resize', this.resizeListenerFn)
      }
      this.generalListeners = events.map(eventName => ({
        fullName: 'plotly_' + eventName,
        handler: (...args: unknown[]) => { this.$emit(eventName, ...args) }
      }))
      const container = this.$refs['container'] as HTMLElement & { on: (name: string, handler: (...args: unknown[]) => void) => void }
      this.generalListeners.forEach(obj => { container.on(obj.fullName, obj.handler) })
    },
    ...passthroughMethods,
    toImage(options: Record<string, unknown>) {
      const el = this.$refs['container'] as HTMLElement
      return Plotly.toImage(el, defaults(options, { format: 'png', width: el.clientWidth, height: el.clientHeight }))
    },
    downloadImage(options: Record<string, unknown>) {
      const el = this.$refs['container'] as HTMLElement & { layout?: { title?: string } }
      return Plotly.downloadImage(el, defaults(options, {
        format: 'png',
        width: el.clientWidth,
        height: el.clientHeight,
        filename: (el.layout?.title ?? 'plot') + ' - ' + new Date().toISOString()
      }))
    },
    getOptions() {
      const el = this.$refs['container'] as HTMLElement
      const opts: Record<string, unknown> = this.options ? { ...this.options } : {}
      if (!opts['toImageButtonOptions']) opts['toImageButtonOptions'] = {} as Record<string, unknown>
      const imgOpts = opts['toImageButtonOptions'] as Record<string, unknown>
      if (!imgOpts['width']) imgOpts['width'] = el.clientWidth
      if (!imgOpts['height']) imgOpts['height'] = el.clientHeight
      return opts
    },
    plot() {
      return Plotly.plot(this.$refs['container'] as HTMLElement, this.data, this.internalLayout, this.getOptions())
    },
    newPlot() {
      return Plotly.newPlot(this.$refs['container'] as HTMLElement, this.data, this.internalLayout, this.getOptions())
    },
    react() {
      return Plotly.react(this.$refs['container'] as HTMLElement, this.data, this.internalLayout, this.getOptions())
    }
  }
})
</script>
<style>
</style>
