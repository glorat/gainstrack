<template>
    <div>
        <div v-if="c.commandType">
            <add-cmd :input="c" :command-columns="commandTableColumns" @cancel="addCancel"></add-cmd>
        </div>
        <div v-if="!c.commandType">
            Add Entry
            <span v-for="cmd in scopedCommands" :key="cmd.prefix"><button @click="setupCommand(cmd)">{{ cmd.title }}</button></span>
        </div>
        <command-table :cmds="displayCommands" :columns="commandTableColumns"></command-table>
    </div>
</template>

<script lang="ts">
    import AddCmd from '@/pages/AddCmd.vue';
    import axios from 'axios';
    import {mapGetters} from 'vuex';
    import CommandEditor from '../components/CommandEditor.vue';
    import CommandTable from '@/components/CommandTable.vue';
    import {cloneDeep} from 'lodash';
    import {CommandConfig, commands, defaultCommand} from '@/config/commands';
    import Vue from 'vue';
    import {AccountCommandDTO, Amount} from '../models';

    export default Vue.extend({
        name: 'Command',
        components: {AddCmd, CommandEditor, CommandTable},
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
            axios.get('/api/command/' + this.accountId)
                .then(response => this.info = response.data)
                .catch(error => this.$notify.error(error));
        },
        methods: {
            setupCommand(cmd: CommandConfig): void {
                const c = {accountId: this.accountId, commandType: cmd.prefix};
                this.c = defaultCommand(c);
            },
            addCancel(): void {
              this.c = {} as AccountCommandDTO;
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
