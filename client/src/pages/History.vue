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
import { ref, onMounted } from 'vue'
import { qnotify } from 'src/boot/notify'
import { useAppStore } from 'src/stores'
import { fetchLedgerRecords } from 'src/lib/ledger/firestoreLedger'

const store = useAppStore()

interface HistoryEvent {
  adds?: string[][]
  removes?: string[][]
}

interface Commit {
  event?: HistoryEvent
}

const commits = ref<Commit[]>([])

onMounted(async () => {
  const uid = store.ledgerUid
  if (!uid) return // anonymous users have no persisted history
  try {
    const records = await fetchLedgerRecords(uid)
    // `event` is stored as a JSON string; most recent commit first.
    commits.value = records
      .sort((a, b) => b.streamRevision - a.streamRevision)
      .map(r => ({ event: JSON.parse(r.event) as HistoryEvent }))
  } catch (error: unknown) {
    qnotify.error(String(error))
  }
})
</script>

<style scoped>

</style>
