<template>
    <div>
        <div v-if="c.commandType">
            <add-cmd :input="c" :command-columns="commandTableColumns" @cancel="addCancel" has-cancel></add-cmd>
        </div>
        <div v-if="!c.commandType">
            Add Entry
            <span v-for="cmd in scopedCommands" :key="cmd.prefix"><button @click="setupCommand(cmd)"
                                                                          :tag="cmd.prefix"
                                                                          :title="cmd.description">{{ cmd.title }}</button></span>
        </div>
        <h5>Existing entries</h5>
        <command-table :cmds="displayCommands" :columns="commandTableColumns"></command-table>
    </div>
</template>

<script lang="ts">
  import AddCmd from '@/pages/AddCmd.vue';
  import CommandTable from '@/components/CommandTable.vue';
  import { AccountCommandDTO, Amount } from '../models';
  import axios from 'axios';
  import { CommandConfig, commands, defaultCommand } from '../config/commands';
  import { mapGetters } from 'vuex';
  import Vue from 'vue';

  export default Vue.extend({
    name: 'AccountJournal',
      components: {AddCmd, CommandTable},
      props: ['accountId'],
      data() {
          return {
              c: {} as AccountCommandDTO,
              info: {
                  account: 'Loading...',
                  commands: [] as AccountCommandDTO[]
              },
              commandStr: '',
          };
      },
      mounted() {
          this.refresh();
      },
      methods: {
          refresh(): void {
              axios.get('/api/command/' + this.accountId)
                      .then(response => this.info = response.data)
                      .catch(error => this.$notify.error(error));
          },
          setupCommand(cmd: CommandConfig): void {
              const c = {accountId: this.accountId, commandType: cmd.prefix};

              this.c = defaultCommand(c);
          },
          addCancel(): void {
              this.c = {} as AccountCommandDTO;
              this.refresh();
          },
          gainstrackChange(ev: string): void {
              this.commandStr = ev;
          },
          testCommand(): void {
              const str = this.commandStr;
              axios.post('/api/post/test', {str})
                      .then(response => this.$notify.success(response.data.success))
                      .catch(error => this.$notify.error(error.response.data));
          },
          addCommand(): void {
              const str = this.commandStr;
              axios.post('/api/post/add', {str})
                      .then(response => this.$notify.success(response.data))
                      .catch(error => this.$notify.error(error.response.data));
          },
      },
      computed: {
          scopedCommands(): CommandConfig[] {
              const acct = this.findAccount(this.accountId);
              return commands.filter(c => acct && c.appliesTo(acct));
          },
          displayCommands(): AccountCommandDTO[] {
              if (this.c.commandType) {
                  return this.info.commands.filter(c => c.commandType === this.c.commandType);
              } else {
                  return this.info.commands;
              }
          },
          commandTableColumns(): string[] {
              if (this.c.commandType) {
                  const cfg = commands.find(c => c.prefix === this.c.commandType);
                  const cols = cfg ? [...cfg.columns, 'date', 'description'] : [];
                  return cols;
              } else {
                  return [];
              }
          },
          ...mapGetters([
              'findAccount',
          ]),
      },
      filters: {
          amount(value: Amount): string {
              if (!value) {
                  return '';
              } else {
                  return `${value.number} ${value.ccy}`;
              }

          }
      }
  });
</script>

<style scoped>

</style>