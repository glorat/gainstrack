<template>
  <q-card class="add-cmd">
    <q-card-section v-if="title">
      <div class="text-h6">{{ title }}</div>
    </q-card-section>
    <q-card-section v-if="!success">
      <command-editor :modelValue="c" v-on:command-changed="commandChanged"
                      v-on:gainstrack-changed="gainstrackChange($event)"
                      :options="options"
      ></command-editor>
    </q-card-section>

    <hr>
    <q-card-actions v-if="!success" align="right">
      <q-btn class="c-cancel" color="primary" type="button" v-on:click="cancel" v-if="hasCancel">Cancel</q-btn>
      <q-btn class="c-add" color="primary"
             :disable=" (result.errors.length>0) || !commandStr || adding || testing"
             :loading="adding || testing"
             @click="addCommand">Add
        <template v-slot:loading>
          <q-spinner v-if="adding" /><q-spinner-grid v-else/>
        </template>
      </q-btn>
      <!--        <q-btn flat label="Cancel" v-close-popup/>-->
      <!--        <q-btn flat label="Submit" @click="onOKClick" />-->
    </q-card-actions>

    <q-card-section>
        <pre style="font-size: xx-small">{{ commandStr }}</pre>
    </q-card-section>

    <q-card-section v-if="result.errors.length>0">
      <source-errors :errs="result.errors"></source-errors>
    </q-card-section>

    <q-card-section v-if="result.added[0] && !hideChanges">
      <!--            <router-link v-if="added[0]" :to="{name:'account', params:{accountId:added[0].accountId}}">{{added[0].accountId}}</router-link>-->
      <h4>Balance changes</h4>
      <table class="queryresults sortable">
        <thead>
        <tr>
          <th>Account</th>
          <th>Position Change</th>
          <th>Value Change</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="change in result.accountChanges" :key="change.accountId">
          <td>
            <router-link :to="{name: 'account', params: {accountId: change.accountId}}">{{ change.accountId }}
            </router-link>
          </td>
          <td class="num"><span v-for="amt in change.unitChange" :key="amt.ccy">{{ amt.number }} {{ amt.ccy }} </span>
          </td>
          <td class="num">{{ change.valueChange }} {{ baseCcy }}</td>
        </tr>
        <tr>
          <td class="subtotal">Networth Change</td>
          <td class="subtotal"></td>
          <td class="subtotal num">{{ result.networthChange }}</td>
        </tr>
        </tbody>
      </table>
      <button class="c-cancel" type="button" v-on:click="cancel" v-if="success && hasCancel">Done</button>
      <template v-if="!hideJournal">
        <h4>Journal additions</h4>
        <command-table :cmds="added" :columns="commandColumns"></command-table>
      </template>
    </q-card-section>


  </q-card>
</template>

<script setup lang="ts">
import CommandEditor from '../components/CommandEditor.vue'
import axios from 'axios'
import CommandTable from '../components/CommandTable.vue'
import SourceErrors from '../components/SourceErrors.vue'
import { debounce } from 'lodash'
import { useAppStore } from 'src/stores'
import { apiCmdTest } from 'src/lib/apiFacade'
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { axiosErrorMessage, qnotify } from 'src/boot/notify'
import type { AccountCommandDTO, ParseError } from 'src/lib/assetdb/models'
import type { CmdTestResponse } from 'src/lib/apiFacade'

const props = defineProps<{
  title?: string
  hideJournal?: boolean
  hideChanges?: boolean
  options?: Record<string, unknown>
  modelValue?: Partial<AccountCommandDTO>
  commandColumns?: string[]
  hasCancel?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [cmd: Partial<AccountCommandDTO>]
  'cancel': []
  'command-added': [str: string]
}>()

const store = useAppStore()
const route = useRoute()

const commandStr = ref('')
const result = ref<CmdTestResponse>({ added: [], accountChanges: [], errors: [], networthChange: 0 })
const added = ref<AccountCommandDTO[]>([])
const testing = ref(false)
const success = ref(false)
const adding = ref(false)

const baseCcy = computed(() => store.baseCcy)

const c = computed((): Partial<AccountCommandDTO> => {
  const cmd: Partial<AccountCommandDTO> = props.modelValue ? { ...props.modelValue } : {}
  cmd.commandType = (cmd.commandType ?? route.query.cmd) as string | undefined
  return cmd
})

function gainstrackChange(ev: string) {
  commandStr.value = ev
  testing.value = true
  testCommand()
}

function commandChanged(cmd: Record<string, unknown>) {
  emit('update:modelValue', cmd)
}

function cancel() {
  emit('cancel')
}

const testCommand = debounce(async () => {
  const str = commandStr.value
  try {
    if (str) {
      testing.value = true
      result.value = await apiCmdTest(store, { str })
    }
  } catch (error) {
    console.error(error)
    qnotify.error(String(error))
  } finally {
    testing.value = false
  }
}, 1000)

function addCommand() {
  const str = commandStr.value
  adding.value = true
  axios.post('/api/post/add', { str })
    .then(response => {
      const data = response.data as { errors: ParseError[]; added: AccountCommandDTO[] }
      if (data.errors.length > 0) {
        qnotify.warning('Errors...' + data.errors[0].message)
      } else {
        added.value = data.added
        success.value = true
        qnotify.success(`${added.value.length} entries added`)
        store.reload()
        emit('command-added', str)
      }
    })
    .catch((error: unknown) => qnotify.error(axiosErrorMessage(error)))
    .finally(() => { adding.value = false })
}
</script>

<style scoped>
  .subtotal {
    border-top-color: black;
    border-top-width: 2px;
    border-top-style: solid;
  }
</style>
