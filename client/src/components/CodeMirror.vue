<template>
  <div ref="container" class="source-editor-wrapper"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { EditorState, StateEffect, StateField } from '@codemirror/state'
import { EditorView, Decoration } from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import { basicSetup } from 'codemirror'

const setErrorLines = StateEffect.define<number[]>()

const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(setErrorLines)) {
        const sorted = [...e.value].sort((a, b) => a - b)
        deco = Decoration.set(
          sorted
            .filter(l => l >= 1 && l <= tr.state.doc.lines)
            .map(l => Decoration.line({ class: 'cm-error-line' }).range(tr.state.doc.line(l).from))
        )
      }
    }
    return deco
  },
  provide: f => EditorView.decorations.from(f)
})

const props = defineProps<{
  modelValue: string
  errors?: Array<{ line: number }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
}>()

const container = ref<HTMLElement>()
const route = useRoute()
let view: EditorView | null = null
let externalUpdate = false

onMounted(() => {
  view = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        EditorView.lineWrapping,
        errorLineField,
        EditorView.updateListener.of(update => {
          if (update.docChanged && !externalUpdate) {
            const val = update.state.doc.toString()
            emit('update:modelValue', val)
            emit('change', val)
          }
        })
      ]
    }),
    parent: container.value!
  })
  applyErrors(props.errors ?? [])
})

onBeforeUnmount(() => {
  view?.destroy()
})

watch(() => props.modelValue, (newVal) => {
  if (!view || newVal === view.state.doc.toString()) return

  externalUpdate = true
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: newVal } })
  externalUpdate = false

  const lineNum = Number(route.query.line)
  if (lineNum >= 1 && lineNum <= view.state.doc.lines) {
    const pos = view.state.doc.line(lineNum).from
    view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: 'center' }) })
  }

  applyErrors(props.errors ?? [])
})

watch(() => props.errors, (newErrors) => {
  applyErrors(newErrors ?? [])
})

function applyErrors(errors: Array<{ line: number }>) {
  if (!view) return
  view.dispatch({ effects: setErrorLines.of(errors.map(e => e.line)) })
}
</script>

<style>
.cm-error-line { background-color: yellow; }
</style>
