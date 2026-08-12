// GPL-2.0-only — see ../LICENSE and ../README.md.
//
// The standalone site: paste or drop a ledger, get the JSON. Also the place a person can satisfy
// themselves that the thing works before pointing another site at it.

import { beancount, warmOfflineCache, type LedgerFile } from './beancount.ts';
import { countByType, type DumpDocument } from './schema.ts';
import { SAMPLE } from './sample.ts';

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`missing element #${id}`);
  return element as T;
};

const source = $<HTMLTextAreaElement>('source');
const fileInput = $<HTMLInputElement>('file');
const fileList = $<HTMLUListElement>('files');
const drop = $('drop');
const output = $('output');
const summary = $<HTMLDListElement>('summary');
const errors = $<HTMLUListElement>('errors');
const status = $('status');
const runtimeLine = $('runtime');
const convert = $<HTMLButtonElement>('convert');
const copy = $<HTMLButtonElement>('copy');
const download = $<HTMLButtonElement>('download');

/** Files opened or dropped. Empty means "use whatever is in the textarea". */
let opened: LedgerFile[] = [];
let entryName = 'ledger.beancount';
let latest: { json: string; name: string } | undefined;

function note(message: string): void {
  status.textContent = message;
}

function renderFiles(): void {
  fileList.textContent = '';
  fileList.hidden = opened.length === 0;
  source.hidden = opened.length > 0;

  for (const file of opened) {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = file.name;
    if (file.name === entryName) item.classList.add('entry');

    const size = document.createElement('span');
    size.className = 'size';
    size.textContent = `${(file.content.length / 1024).toFixed(1)} KiB`;

    // Which file is the top-level ledger matters — the others are only reachable through its
    // `include` lines — and guessing wrong produces a baffling empty result.
    const choose = document.createElement('button');
    choose.type = 'button';
    choose.className = 'link';
    choose.textContent = file.name === entryName ? 'main file' : 'make main';
    choose.disabled = file.name === entryName;
    choose.addEventListener('click', () => {
      entryName = file.name;
      renderFiles();
    });

    item.append(name, size, choose);
    fileList.append(item);
  }

  const clear = document.createElement('li');
  clear.className = 'clear';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'link';
  button.textContent = 'clear';
  button.addEventListener('click', () => {
    opened = [];
    renderFiles();
  });
  clear.append(button);
  if (opened.length > 0) fileList.append(clear);
}

async function accept(files: FileList | File[]): Promise<void> {
  const read = await Promise.all(
    [...files].map(async (file) => ({ name: file.name, content: await file.text() })),
  );
  opened = read;
  // The largest file is the main ledger far more often than not; includes tend to be price lists.
  entryName = read.reduce((a, b) => (a.content.length >= b.content.length ? a : b)).name;
  renderFiles();
  note(`${read.length} file(s) loaded.`);
}

function ledgerFiles(): { files: LedgerFile[]; entry: string } {
  if (opened.length > 0) return { files: opened, entry: entryName };
  return {
    files: [{ name: 'ledger.beancount', content: source.value }],
    entry: 'ledger.beancount',
  };
}

function renderSummary(document_: DumpDocument, millis: number, version: string): void {
  const counts = countByType(document_);
  const rows: [string, string][] = [
    ['entries', String(document_.entries.length)],
    ['directives', Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ') || '—'],
    ['loader errors', String(document_.errors.length)],
    ['took', `${Math.round(millis)} ms with beancount ${version}`],
  ];

  summary.textContent = '';
  for (const [term, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = value;
    summary.append(dt, dd);
  }
  summary.hidden = false;

  errors.textContent = '';
  errors.hidden = document_.errors.length === 0;
  for (const error of document_.errors) {
    const item = document.createElement('li');
    item.textContent = error.line ? `${error.message} (line ${error.line})` : error.message;
    errors.append(item);
  }
}

async function run(): Promise<void> {
  const { files, entry } = ledgerFiles();
  if (files.every((file) => !file.content.trim())) {
    note('Nothing to convert.');
    return;
  }

  convert.disabled = true;
  output.textContent = '';
  summary.hidden = true;
  errors.hidden = true;

  try {
    const engine = await beancount({ onStatus: note });
    runtimeLine.textContent = `beancount ${engine.info.beancount} · python ${engine.info.python} · pyodide ${engine.info.pyodide}`;

    note('Loading the ledger…');
    const result = await engine.dump({ files, entry, indent: 2 });

    // A megabyte of JSON in a <pre> is a long freeze for no benefit; the download has all of it.
    const preview =
      result.json.length > 400_000
        ? `${result.json.slice(0, 400_000)}\n\n… truncated for display — download for the whole document`
        : result.json;
    output.textContent = preview;

    renderSummary(result.document, result.millis, engine.info.beancount);
    latest = { json: result.json, name: `${entry.replace(/\.[^.]+$/, '')}.json` };
    copy.disabled = false;
    download.disabled = false;
    note(
      result.document.errors.length > 0
        ? `Converted, with ${result.document.errors.length} loader error(s) — see below.`
        : 'Converted.',
    );
  } catch (error) {
    output.textContent = error instanceof Error ? error.message : String(error);
    note('Failed.');
  } finally {
    convert.disabled = false;
  }
}

convert.addEventListener('click', () => void run());

fileInput.addEventListener('change', () => {
  if (fileInput.files?.length) void accept(fileInput.files);
});

for (const event of ['dragenter', 'dragover'] as const) {
  drop.addEventListener(event, (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
}
for (const event of ['dragleave', 'drop'] as const) {
  drop.addEventListener(event, () => drop.classList.remove('over'));
}
drop.addEventListener('drop', (event) => {
  event.preventDefault();
  const files = event.dataTransfer?.files;
  if (files?.length) void accept(files);
});

$('sample').addEventListener('click', () => {
  opened = [];
  renderFiles();
  source.value = SAMPLE;
  note('Sample loaded.');
});

copy.addEventListener('click', () => {
  if (latest) void navigator.clipboard.writeText(latest.json).then(() => note('Copied.'));
});

download.addEventListener('click', () => {
  if (!latest) return;
  const url = URL.createObjectURL(new Blob([latest.json], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = latest.name;
  anchor.click();
  URL.revokeObjectURL(url);
});

$('offline').addEventListener('click', () => {
  void warmOfflineCache(note).catch((error: unknown) =>
    note(error instanceof Error ? error.message : String(error)),
  );
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Registered, never awaited: the page is fully usable before it lands, and a failure here should
  // cost the visitor nothing.
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}
