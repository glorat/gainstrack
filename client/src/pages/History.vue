<template>
    <my-page padding>
        <template v-for="commit in commits">
            <template v-if="commit.event && commit.event.adds">
                Added: <pre><template v-for="cmd in commit.event.adds"><template
                        v-for="line in cmd">{{ line }}
</template></template></pre></template>
            <template v-if="commit.event && commit.event.removes">
                Removed: <pre><template v-for="cmd in commit.event.removes"><template
                    v-for="line in cmd">{{ line }}
</template></template></pre>
            </template>

        </template>
    </my-page>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref, onMounted } from 'vue'
import { qnotify } from 'src/boot/notify'

interface HistoryEvent {
  adds?: string[][]
  removes?: string[][]
}

interface Commit {
  event?: HistoryEvent
}

const commits = ref<Commit[]>([])

onMounted(() => {
  axios.post<Commit[]>('/api/history')
    .then(response => { commits.value = response.data })
    .catch((error: unknown) => qnotify.error(String(error)))
})
</script>

<style scoped>

</style>
