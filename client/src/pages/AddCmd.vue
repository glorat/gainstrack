<template>
  <q-card class="add-cmd">
    <q-card-section v-if="title">
      <div class="text-h6">{{ title }}</div>
    </q-card-section>
    <q-card-section v-if="!success">
      <command-editor :input="c" v-on:command-changed="commandChanged"
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
        <pre>{{ commandStr }}</pre>
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
      </table>
      <button class="c-cancel" type="button" v-on:click="cancel" v-if="success && hasCancel">Done</button>
      <template v-if="!hideJournal">
        <h4>Journal additions</h4>
        <command-table :cmds="added" :columns="commandColumns"></command-table>
      </template>
    </q-card-section>


  </q-card>
</template>

<script>
  import CommandEditor from '../components/CommandEditor'
  import axios from 'axios'
  import CommandTable from '../components/CommandTable'
  import SourceErrors from '../components/SourceErrors'
  import { debounce } from 'lodash'
  import EventBus from '../event-bus'
  import { mapGetters } from 'vuex'
  import { apiCmdTest } from 'src/lib/apiFacade'

  export default {
    name: 'AddCmd',
    components: {
      CommandTable,
      CommandEditor,
      SourceErrors
    },
    props: {
      title: {
        type: String
      },
      hideJournal: {
        type: Boolean,
        default: false,
      },
      hideChanges: {
        type: Boolean,
        default: false,
      },
      options: {
        type: Object,
      },
      input: Object,
      commandColumns: {
        type: Array,
        default: () => [],
      },
      hasCancel: {
        type: Boolean,
        default: false,
      }
    },
    data () {
      return {
        commandStr: '',
        result: {
          added: [],
          accountChanges: [],
          errors: [],
          networthChange: 0.0,
        },
        added: [],
        accountChanges: [],
        errors: [],
        testing: false,
        success: false,
        adding: false,
      }
    },
    computed: {
      ...mapGetters(['baseCcy']),
      c () {
        let c = {}
        if (this.input) {
          c = { ...this.input }
        }
        c.commandType = c.commandType || this.$route.query.cmd
        return c
      },
      networthChange () {
        return this.result.networthChange
      }
    },
    methods: {
      gainstrackChange (ev) {
        this.commandStr = ev
        this.errors = []
        this.testing = true
        this.testCommand()
      },
      commandChanged (cmd) {
        this.$emit('input', cmd)
      },
      cancel () {
        this.$emit('cancel')
      },
      testCommand: debounce(async function () {
        const str = this.commandStr
        const notify = this.$notify
        if (str) {
          this.testing = true
          try {
            this.result = await apiCmdTest(this.$store, {str})
          }
          catch (error) {
            console.error(error);
            notify.error(error);
          }
          finally {
            this.testing = false;
          }
        }
      }, 1000),
      addCommand () {
        const str = this.commandStr
        const notify = this.$notify
        this.adding = true
        axios.post('/api/post/add', { str })
          .then(response => {
            if (response.data.errors.length > 0) {
              notify.warning('Errors...' + response.data.errors[0].message)
            } else {
              this.added = response.data.added
              this.success = true
              this.$notify.success(`${this.added.length} entries added`)
              this.$store.dispatch('reload')
              this.$emit('command-added', str)
              EventBus.$emit('command-added', str)
            }

          })
          .catch(error => this.$notify.error(error.stack || error))
          .finally(() => this.adding = false)
      },
    },
  }
</script>

<style scoped>
  .subtotal {
    border-top-color: black;
    border-top-width: 2px;
    border-top-style: solid;
  }
</style>
