<template>
  <div class="markdown-body" v-html="renderedHtml" @click="handleClick"></div>
</template>

<script setup lang="ts">
import axios from 'axios'
import MarkdownIt from 'markdown-it'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const md = new MarkdownIt()

const props = defineProps<{
  page?: string
  source?: string
}>()

const router = useRouter()
const content = ref('')

const renderedHtml = computed(() => md.render(content.value))

const loadPage = async (page: string) => {
  const resolvedPage = page.endsWith('.md') ? page : `${page}.md`
  try {
    const response = await axios.get('/md/' + resolvedPage)
    content.value = response.data
  } catch (error: any) {
    content.value = `${resolvedPage}: ${error.message}`
  }
}

const handleClick = (e: MouseEvent) => {
  const anchor = (e.target as HTMLElement).closest('a')
  if (!anchor) return
  const href = anchor.getAttribute('href')
  if (href && href.startsWith('/')) {
    e.preventDefault()
    router.push({ path: href })
  }
}

onMounted(() => {
  if (props.source !== undefined) {
    content.value = props.source
  } else if (props.page) {
    loadPage(props.page)
  }
})

watch(() => props.source, (val) => {
  if (val !== undefined) content.value = val
})

watch(() => props.page, (val) => {
  if (val) loadPage(val)
})
</script>
