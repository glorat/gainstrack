<template>
  <div ref="container" class="vue-plotly" />
</template>

<script setup lang="ts">
import Plotly from 'plotly.js-dist'
import debounce from 'lodash/debounce'
import defaults from 'lodash/defaults'
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  data?: unknown[]
  layout?: Record<string, unknown>
  options?: Record<string, unknown>
  autoResize?: boolean
  watchShallow?: boolean
}>(), {
  watchShallow: false
})

const emit = defineEmits([
  'click', 'hover', 'unhover', 'selecting', 'selected', 'restyle', 'relayout',
  'autosize', 'deselect', 'doubleclick', 'redraw', 'animated', 'afterplot'
])

const container = ref<HTMLElement>()
const dataRevision = ref(1)

function getOptions(): Record<string, unknown> {
  const el = container.value!
  const opts: Record<string, unknown> = props.options ? { ...props.options } : {}
  if (!opts['toImageButtonOptions']) opts['toImageButtonOptions'] = {}
  const imgOpts = opts['toImageButtonOptions'] as Record<string, unknown>
  if (!imgOpts['width']) imgOpts['width'] = el.clientWidth
  if (!imgOpts['height']) imgOpts['height'] = el.clientHeight
  return opts
}

function react() {
  Plotly.react(container.value!, props.data, { ...props.layout, datarevision: dataRevision.value }, getOptions())
}

const deep = { deep: true }
const shallow = { deep: false }

watch(() => props.data, () => { dataRevision.value++; react() }, props.watchShallow ? shallow : deep)
watch(() => props.options, react, props.watchShallow ? shallow : deep)
watch(() => props.layout, react, props.watchShallow ? shallow : deep)

let resizeListener: (() => void) | null = null
type PlotlyEl = HTMLElement & {
  on: (event: string, handler: (...args: unknown[]) => void) => void
  removeAllListeners: (event: string) => void
}

onMounted(() => {
  react()

  if (props.autoResize) {
    resizeListener = debounce(() => { dataRevision.value++; react() }, 200)
    window.addEventListener('resize', resizeListener)
  }

  const el = container.value as PlotlyEl
  const plotlyEvents = [
    'click', 'hover', 'unhover', 'selecting', 'selected', 'restyle', 'relayout',
    'autosize', 'deselect', 'doubleclick', 'redraw', 'animated', 'afterplot'
  ]
  plotlyEvents.forEach(name => {
    el.on('plotly_' + name, (...args) => emit(name as Parameters<typeof emit>[0], ...args))
  })
})

onBeforeUnmount(() => {
  if (resizeListener) window.removeEventListener('resize', resizeListener)
  const el = container.value as PlotlyEl
  const plotlyEvents = [
    'click', 'hover', 'unhover', 'selecting', 'selected', 'restyle', 'relayout',
    'autosize', 'deselect', 'doubleclick', 'redraw', 'animated', 'afterplot'
  ]
  plotlyEvents.forEach(name => el.removeAllListeners?.('plotly_' + name))
  Plotly.purge(el)
})
</script>

<style>
</style>
