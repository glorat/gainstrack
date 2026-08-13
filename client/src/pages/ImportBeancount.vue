<template>
  <my-page padding>
    <h5 class="q-mt-none">Import from Beancount</h5>

    <p>
      Your ledger is loaded by beancount itself, compiled to WebAssembly and
      running in your browser on
      <a :href="BEAN2GAIN_ORIGIN" target="_blank" rel="noopener">bean2gain</a>
      (a separate site, kept separate for licensing reasons). Nothing is
      uploaded to a server, and nothing leaves your machine.
    </p>
    <p class="text-caption text-grey-8">
      Include every file your ledger pulls in with <code>include</code>, and
      name the top-level one below. The first conversion downloads a Python
      interpreter, so it takes a moment.
    </p>

    <q-file
      v-model="files"
      multiple
      filled
      label="Drop your .beancount files here or click to upload"
      accept=".beancount,.bean,.txt"
      :disable="busy"
      @update:model-value="onFilesPicked"
    >
      <template v-slot:before>
        <q-icon :name="matCloudUpload" />
      </template>
    </q-file>

    <div v-if="files && files.length > 1" class="q-mt-md">
      <q-select
        v-model="entry"
        :options="fileNames"
        label="Top-level ledger"
        filled
        :disable="busy"
      />
    </div>

    <div class="q-mt-md row items-center q-gutter-md">
      <q-btn
        color="primary"
        label="Convert"
        :disable="!files || files.length === 0 || busy"
        :loading="busy"
        @click="convert"
      />
      <q-toggle
        v-model="verify"
        :disable="busy"
        label="Check the result against beancount"
      />
      <q-toggle v-model="raw" :disable="busy" label="Skip intent recognition" />
    </div>

    <div v-if="status" class="q-mt-md text-grey-8">
      <q-spinner v-if="busy" size="1.2em" class="q-mr-sm" />{{ status }}
    </div>

    <q-banner v-if="failure" class="bg-red-2 q-mt-md">
      <template v-slot:avatar
        ><q-icon :name="matError" color="negative"
      /></template>
      {{ failure }}
    </q-banner>

    <template v-if="result">
      <!-- First, because it explains everything below it. A ledger beancount could not fully
           load is missing entries before the conversion ever sees it. -->
      <q-banner
        v-if="result.verification?.sourceErrors.length"
        class="bg-orange-2 q-mt-md"
      >
        <template v-slot:avatar
          ><q-icon :name="matWarning" color="warning"
        /></template>
        Beancount could not fully load your original ledger. These problems
        predate the import, and anything beancount dropped is missing from the
        conversion too. The migration report names what was affected.
        <ul class="q-my-xs">
          <li v-for="e in result.verification.sourceErrors" :key="e">
            {{ e }}
          </li>
        </ul>
      </q-banner>

      <q-banner
        v-if="result.verification"
        class="q-mt-md"
        :class="result.verification.ok ? 'bg-green-2' : 'bg-red-2'"
      >
        <template v-slot:avatar>
          <q-icon
            :name="result.verification.ok ? matCheckCircle : matError"
            :color="result.verification.ok ? 'positive' : 'negative'"
          />
        </template>
        <template v-if="result.verification.ok">
          <!-- Qualified when the source did not load: what we checked against is the partial
               ledger beancount managed to read, not the file you wrote. -->
          <template v-if="result.verification.sourceErrors.length">
            Verified as far as your ledger loads. Beancount read the converted
            ledger back, and every account beancount could read holds what it
            held.
          </template>
          <template v-else>
            Verified. Beancount read the converted ledger back and every account
            holds exactly what it held.
          </template>
        </template>
        <template v-else>
          <div class="text-weight-medium">
            This import did not survive the round trip. Do not save it.
          </div>
          <ul class="q-my-xs">
            <li v-for="e in result.verification.reexportErrors" :key="e">
              Beancount rejected the re-export: {{ e }}
            </li>
            <li v-for="e in result.verification.generatorErrors" :key="e">
              The ledger does not generate: {{ e }}
            </li>
            <li v-for="p in result.verification.plugged" :key="p">
              Swept into an adjustment account: {{ p }}
            </li>
            <li
              v-for="d in result.verification.differences"
              :key="`${d.account}/${d.currency}`"
            >
              {{ d.account }} {{ d.currency }}: was {{ d.before ?? "absent" }},
              now {{ d.after ?? "absent" }}
            </li>
          </ul>
        </template>
      </q-banner>

      <q-banner
        v-if="result.report.warnings.length"
        class="bg-orange-2 q-mt-md"
      >
        <template v-slot:avatar
          ><q-icon :name="matWarning" color="warning"
        /></template>
        <ul class="q-my-none">
          <li v-for="w in result.report.warnings" :key="w">{{ w }}</li>
        </ul>
      </q-banner>

      <h6 class="q-mb-sm">What came across</h6>
      <p>{{ headline }}</p>

      <div v-for="section in sections" :key="section.title" class="q-mb-md">
        <div class="text-weight-medium">{{ section.title }}</div>
        <p class="text-caption text-grey-8 q-mb-xs">{{ section.blurb }}</p>
        <table class="counts">
          <tr v-for="row in section.rows" :key="row.label">
            <td>{{ row.label }}</td>
            <td class="text-right">{{ row.count }}</td>
          </tr>
        </table>
      </div>

      <q-expansion-item
        dense
        label="Show the full report"
        class="q-mb-md"
      >
        <pre class="report">{{ formatReport(result.report) }}</pre>
      </q-expansion-item>

      <h6 class="q-mb-sm">The converted ledger</h6>
      <pre class="preview">{{ result.text }}</pre>

      <div class="q-mt-md row q-gutter-md">
        <q-btn outline color="primary" label="Download" @click="download" />
        <q-btn
          color="primary"
          label="Replace my ledger"
          :disable="saving"
          @click="save('replace')"
        />
        <q-btn
          color="secondary"
          label="Append to my ledger"
          :disable="saving"
          @click="save('append')"
        />
      </div>
      <p class="text-caption text-grey-8 q-mt-sm">
        Appending keeps what you already have and adds this on the end. It will
        be refused if the combined ledger does not generate (two
        <code>open</code>s for one account, most likely). In that case, download
        the file and merge it in the editor.
      </p>
    </template>
  </my-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import {
  matCheckCircle,
  matCloudUpload,
  matError,
  matWarning,
} from '@quasar/extras/material-icons';
import { useAppStore } from 'src/stores';
import { qnotify } from 'src/boot/notify';
import { downloadText } from 'src/lib/export/download';
import { BEAN2GAIN_ORIGIN, getConverter } from 'src/lib/bean2gain/converter';
import { formatReport } from 'src/lib/import/beancountImport';
import {
  BrowserImportResult,
  importFromBeancount,
} from 'src/lib/import/browserImport';
import type { LedgerFile } from 'src/lib/bean2gain/bridge';

const store = useAppStore();
const router = useRouter();
const q = useQuasar();

const files = ref<File[] | null>(null);
const entry = ref<string | undefined>(undefined);
const verify = ref(true);
const raw = ref(false);
const busy = ref(false);
const saving = ref(false);
const status = ref('');
const failure = ref('');
const result = ref<BrowserImportResult | undefined>(undefined);

const fileNames = computed(() => (files.value ?? []).map(nameOf));

/**
 * Plain-English names for the report's counter keys.
 *
 * The report is written for the CLI, where "lowered" and "lifted" are the vocabulary of the
 * conversion and the reader is looking at the code. Nobody importing a ledger through a website
 * knows those words, and a gainstrack command name means nothing to someone who has only ever
 * written beancount. The raw report is still one click away for anyone who wants it.
 */
const LABELS: Record<string, string> = {
  earn: 'Income received (earn)',
  spend: 'Money spent (spend)',
  fund: 'Capital put in or taken out (fund)',
  tfr: 'Transfers between your accounts (tfr)',
  'tfr (cross-currency)': 'Transfers between currencies (tfr)',
  close: 'Account closures',
  commodity: 'Commodities gainstrack cannot name',
  custom: 'Custom directives',
  document: 'Document links',
  event: 'Events',
  note: 'Notes',
  price: 'Prices gainstrack cannot name',
  query: 'Queries',
  unknown: 'Directives we did not recognise',
  'balance tolerance': 'Tolerances on balance assertions',
  'lot identity (date/label) dropped': 'Purchase dates and labels on lots',
  'transaction beancount could not book': 'Transactions beancount could not book',
};

function rows(counts: Record<string, number>) {
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ label: LABELS[key] ?? key, count }));
}

const headline = computed(() => {
  const report = result.value?.report;
  if (!report) return '';
  const recognised = Object.values(report.lifted).reduce((a, b) => a + b, 0);
  const plain = report.rawTransactions;
  const came = `${recognised + plain} transaction${recognised + plain === 1 ? '' : 's'} came across`;
  if (recognised === 0) {
    return `${came}. None were recognised as a specific kind of event, so all of them are plain transactions.`;
  }
  if (plain === 0) {
    return `${came}, all recognised as a specific kind of event.`;
  }
  return `${came}. ${recognised} recognised as a specific kind of event, and ${plain} kept as plain transactions.`;
});

const sections = computed(() => {
  const report = result.value?.report;
  if (!report) return [];
  const out: { title: string; blurb: string; rows: { label: string; count: number }[] }[] = [];

  if (Object.keys(report.lifted).length) {
    out.push({
      title: 'Recognised events',
      blurb:
        'Gainstrack knows what kind of event each of these is, so the income and investment ' +
        'reports can read them.',
      rows: rows(report.lifted),
    });
  }
  if (report.rawTransactions > 0) {
    out.push({
      title: 'Plain transactions',
      blurb:
        'These hold the right accounts and the right amounts. What they do not say is what kind ' +
        'of event they were, so reports that work from that see only the postings.',
      rows: [{ label: 'Transactions kept as written', count: report.rawTransactions }],
    });
  }
  if (Object.keys(report.commented).length) {
    out.push({
      title: 'Kept as comments',
      blurb:
        'Gainstrack has nowhere to put these, so they stay in the file as comment lines. You can ' +
        'read them, but no report can.',
      rows: rows(report.commented),
    });
  }
  if (Object.keys(report.lossy).length) {
    out.push({
      title: 'Not carried over',
      blurb: 'This is gone from the ledger rather than turned into a comment.',
      rows: rows(report.lossy),
    });
  }
  const split = Object.keys(report.accountFold).length;
  if (split > 0) {
    out.push({
      title: 'Accounts split by currency',
      blurb:
        'A gainstrack account holds one currency. Where yours held several, it became one ' +
        'sub-account per currency. The totals are unchanged.',
      rows: [{ label: 'Sub-accounts created', count: split }],
    });
  }
  return out;
});

/** A ledger that includes another refers to it by relative path, so preserve one if we have it. */
function nameOf(file: File): string {
  return file.webkitRelativePath || file.name;
}

function onFilesPicked() {
  result.value = undefined;
  failure.value = '';
  status.value = '';
  entry.value = files.value?.length ? nameOf(files.value[0]) : undefined;
}

async function convert() {
  const picked = files.value;
  if (!picked?.length) return;

  busy.value = true;
  failure.value = '';
  result.value = undefined;
  try {
    const contents: LedgerFile[] = await Promise.all(
      picked.map(async (file) => ({
        name: nameOf(file),
        content: await file.text(),
      })),
    );

    // `getConverter` is what creates the frame and starts the interpreter downloading, so it is
    // called here rather than on mount: opening the page costs nothing until you convert.
    result.value = await importFromBeancount(getConverter(), contents, {
      entry: entry.value,
      raw: raw.value,
      verify: verify.value,
      onStatus: (message) => {
        status.value = message;
      },
    });
    status.value = `Converted ${result.value.summary.entries} entries with beancount ${result.value.summary.beancount}.`;
  } catch (error) {
    failure.value = String(error instanceof Error ? error.message : error);
    status.value = '';
  } finally {
    busy.value = false;
  }
}

function download() {
  if (result.value) downloadText('imported.gainstrack', result.value.text);
}

function save(mode: 'replace' | 'append') {
  const imported = result.value;
  if (!imported) return;

  // No promise of a restore button, because there is not one. The stream is append-only, so the
  // commands are still in History and could be recovered by hand, and that is all we can claim.
  const warning =
    mode === 'replace'
      ? 'This replaces your entire ledger with the imported one. Everything you see will change. Your current commands remain visible under History, but there is no one-click way back, so download a Gainstrack export first if you want one.'
      : 'This adds the imported ledger to the end of your current one. Both sets of accounts will be present.';

  q.dialog({
    title:
      mode === 'replace' ? 'Replace your ledger?' : 'Append to your ledger?',
    message:
      imported.verification && !imported.verification.ok
        ? `${warning}\n\nThe verification above failed. The numbers did not survive the round trip.`
        : warning,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void apply(mode, imported);
  });
}

async function apply(
  mode: 'replace' | 'append',
  imported: BrowserImportResult,
) {
  saving.value = true;
  try {
    const text =
      mode === 'replace'
        ? imported.text
        : `${await store.fetchGainstrackText()}\n${imported.text}`;

    // Same split as the editor and Port: anonymous visitors have no ledger to persist to, so
    // their import exists in memory only.
    const response = store.canPersist
      ? await store.saveSource(text)
      : { errors: (await store.loadLocalText(text)).errors };
    store.setParseState(response);

    if (response.errors.length > 0) {
      qnotify.warning('There are errors...');
      await router.push({ name: 'errors' });
      return;
    }

    qnotify.success(mode === 'replace' ? 'Ledger replaced' : 'Ledger appended');
    if (store.canPersist) {
      await store.reload();
      await store.fetchGainstrackText();
      router.go(0);
    } else {
      await router.push('/');
    }
  } catch (error) {
    // `saveSource` refuses anything that will not generate, which is exactly what an append that
    // collides with the existing ledger does. Say so rather than leaving the button dead.
    qnotify.error(String(error instanceof Error ? error.message : error));
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.report,
.preview {
  background: #f5f5f5;
  padding: 8px;
  overflow: auto;
  white-space: pre;
  font-size: 12px;
}
.preview {
  max-height: 24rem;
}
.counts td {
  padding: 1px 16px 1px 0;
}
.counts td:last-child {
  padding-right: 0;
  min-width: 4rem;
}
</style>
