<template>
  <div>
    <form id="entry-filters" class="wide-form">
      <span class="spacer"></span>
      <span>Filters: </span>
      <!-- FIXME: Mutating object in child component -->
      <button-toggle v-for="t in entryTypes" :key="t" :name="t" :off-state="offState"></button-toggle>

    </form>

    <q-table
      :rows="filteredEntries"
      row-key="description"
      :columns="columns"
      v-model:pagination="pagination"
      dense
      class="journal"
    >
      <template v-slot:body="props">
        <q-tr :props="props" style="cursor: pointer" v-on:click="props.expand = !props.expand">
          <q-td
            v-for="col in props.cols"
            :key="col.name"
            :props="props"
          >
            <template v-if="col.name==='detail'">
              <!-- eslint-disable-next-line vue/no-unused-vars -->
              <span class="indicators" v-on:click="props.expand = !props.expand"><span v-for="i in props.row.postings"> </span></span>

            </template>
            <template v-else>
              {{ col.value }}
            </template>
          </q-td>
        </q-tr>

        <template v-if="props.expand">
          <q-tr v-show="props.expand" v-for="posting in props.row.postings" :key="posting">
            <q-td class="datecell"></q-td>
            <q-td class="description"><router-link :to="{name:'account', params: { accountId: posting.account }}">{{ posting.account }}</router-link></q-td>
            <q-td class="num">{{ posting.value.number}} {{ posting.value.ccy }} {{ posting.price ? `@${posting.price.number}` : ''}}</q-td>
            <q-td class="num"></q-td>
            <q-td class="num" v-if="showBalance"></q-td>
          </q-tr>
        </template>

      </template>

    </q-table>

  </div>
</template>

<script>
  import ButtonToggle from '../components/ButtonToggle'
  import { uniq } from 'lodash'

  export default {
    name: 'JournalTable',
    components: { ButtonToggle },
    props: {
      entries: Array,
      showBalance: Boolean
    },
    data () {


      const pagination = {
        rowsPerPage: 10,
      };

      return {
        visiblePostings: {},
        offState: {},
        pagination,
      }
    },
    methods: {
      rowClick (row) {
        this.visiblePostings[row] = !this.visiblePostings[row]
      },
    },
    computed: {
      filteredEntries () {
        let ret = this.entries
        const types = this.entryTypes
        types.forEach(t => {
          if (this.offState[t]) {
            ret = ret.filter(e => e.cmdType !== t)
          }
        })
        return ret
      },
      entryTypes () {
        return uniq(this.entries.map(x => x.cmdType))
      },
      columns () {
        const columns = [
          {
            name: 'date',
            label: 'Date',
            field: 'date',
            classes: ['datecell']
          }, {
            name: 'description',
            label: 'Description',
            field: 'description',
            align: 'left',
          }, {
            name: 'detail',
            label: '',
            field: () => ''
          }, {
            name: 'change',
            label: 'Change',
            field: 'change',
            align: 'right',
            classes: ['num']
          }];
        if (this.showBalance) {
          columns.push({name: 'balance', label: 'Balance', field: 'position', classes:['num']})
        }
        return columns;

      }
    }
  }
</script>

<style>

  .journal .balance {
    --entry-type-color: #cfc;
  }

  .journal .close {
    --entry-type-color: hsl(0, 0%, 70%);
  }

  .journal .custom {
    --entry-type-color: #fff3ab;
  }

  .journal .document {
    --entry-type-color: #ffc8ff;
  }

  .journal .note {
    --entry-type-color: #aad0ff;
  }

  .journal .open {
    --entry-type-color: hsl(0, 0%, 92%);
  }

  .journal .other {
    --entry-type-color: #cff;
  }

  .journal .pad {
    --entry-type-color: #8ff;
  }

  .journal .pending {
    --entry-type-color: #f8a;
  }

  .journal .query {
    --entry-type-color: #aad0ff;
  }

  .journal .budget {
    --entry-type-color: #ffddae;
  }

  .journal {
    --color-journal-postings: hsl(0, 0%, 92%);
    --color-journal-metadata: hsl(210, 44%, 67%);
    --color-journal-tag: hsl(210, 61%, 64%);
    --color-journal-link: hsl(203, 39%, 85%);
    --color-journal-posting-indicator: hsl(203, 24%, 80%);
    --color-journal-metadata-indicator: hsl(203, 24%, 40%);
  }
</style>
<style>

  .journal .totals p > span {
    color: var(--color-table-header-text);
    background-color: var(--color-table-header-background);
  }

  .journal p,
  .journal dl {
    border-bottom: thin solid var(--color-table-border);
  }

  .journal .payee {
    cursor: pointer;
  }

  .journal .postings {
    font-size: 0.9em;
    background-color: var(--color-journal-postings);
    opacity: 0.8;
  }

  .journal .postings .num {
    overflow: hidden;
    line-height: 16px;
  }

  .journal > li,
  .journal.show-custom .custom.budget,
  .journal.show-document .document.discovered,
  .journal.show-document .document.linked,
  .journal .metadata,
  .journal .postings {
    display: none;
  }

  .journal .head,
  .journal.show-balance .balance,
  .journal.show-close .close,
  .journal.show-custom .custom,
  .journal.show-document .document,
  .journal.show-note .note,
  .journal.show-open .open,
  .journal.show-pad .pad,
  .journal.show-query .query,
  .journal.show-metadata .metadata,
  .journal.show-postings .postings,
  .transaction.show-postings .postings,
  .transaction.show-postings .metadata {
    display: block;
  }

  .journal.show-transaction.show-cleared .transaction.cleared,
  .journal.show-transaction.show-pending .transaction.pending,
  .journal.show-transaction.show-other .transaction.other,
  .journal.show-document.show-discovered .document.discovered,
  .journal.show-document.show-linked .document.linked,
  .journal.show-custom.show-budget .custom.budget {
    display: block;
  }

  /* Metadata */
  .journal dl {
    padding: 2px 0;
    margin: 0;
    font-size: 0.9em;
  }

  .journal dt {
    display: inline-block;
    float: left;
    width: auto;
    min-width: 4rem;
    margin-left: 9rem;
    color: var(--color-journal-metadata);
  }

  .journal dd {
    margin-left: 15rem;
    cursor: pointer;
  }

  .journal p > .num {
    width: 9rem;
    border-left: 1px solid var(--color-table-border);
  }

  .journal .datecell,
  .journal .flag {
    text-align: center;
    background-color: var(--entry-type-color);
  }

  .journal .datecell {
    width: 5.5rem;
    white-space: nowrap;
  }

  .journal .flag {
    width: 3rem;
  }

  .journal .change {
    font-weight: 500;
  }

  .journal .description {
    display: flex;
    flex: 1;
    align-items: center;
    padding-left: 8px;
  }

  .journal .description .separator {
    width: 4px;
    height: 4px;
    padding: 2px;
    margin: 0 6px;
    background-color: var(--color-text-lighter);
  }

  .journal .description .account-link {
    margin-right: 0.5em;
  }

  .journal .description .num {
    margin: 0 5px;
  }

  .journal .tag,
  .journal .link {
    margin-left: 8px;
    font-size: 0.9em;
    cursor: pointer;
  }

  .journal .tag {
    color: var(--color-journal-tag);
  }

  .journal .link {
    color: var(--color-journal-link);
  }

  .journal .bal {
    background-color: var(--entry-type-color);
  }

  .journal a:hover {
    filter: brightness(80%);
  }

  .journal .filename,
  .journal .url {
    font-family: var(--font-family-monospaced);
    font-size: 0.9em;
  }

  .journal .document .filename {
    margin-left: 1em;
  }

  .indicators {
    display: flex;
    flex-shrink: 3;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    cursor: pointer;
  }

  .indicators span {
    min-width: 6px;
    height: 6px;
    padding: 0;
    margin-right: 4px;
    background-color: var(--color-journal-posting-indicator);
    border-radius: 3px;
  }

  .journal .indicators .pending,
  .journal .indicators .other {
    background-color: var(--entry-type-color);
  }

  .journal .indicators .metadata-indicator {
    height: 16px;
    padding: 0 6px;
    font-size: 10px;
    line-height: 16px;
    color: var(--color-journal-metadata-indicator);
    text-transform: lowercase;
    border-radius: 20px;
  }
</style>
