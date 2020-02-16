<template>
    <div>
        <div>
            <el-date-picker
                    v-model="c.date"
                    type="date"
                    value-format="yyyy-MM-dd"
                    size="mini"
                    :clearable="false"
            >
            </el-date-picker>
        </div>
        <div>
            Transfer:
            <account-selector class="c-account-id" v-model="c.accountId" v-on:input="accountIdChanged"
                              :account-list="transferableAccounts"></account-selector>
        </div>
        <div>
            amount
            <balance-editor class="c-change" v-model="c.change" v-on:input="changeChanged()"></balance-editor>
        </div>
        <div>
            To
            <account-selector v-model="c.otherAccount" v-on:input="otherAccountIdChanged"
                              :account-list="transferableAccounts"></account-selector>
        </div>
        <div>
            value
            <balance-editor v-model="targetChange" v-on:input="inputChanged()"></balance-editor>
        </div>


    </div>
</template>

<script>
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../../mixins/CommandEditorMixin';
    import {DatePicker, Input, Option, Select, Switch} from 'element-ui';
    import AccountSelector from '../AccountSelector';

    export default {
        name: 'Transfer',
        props: {cmd: Object},
        components: {
            BalanceEditor,
            AccountSelector,
            'el-date-picker': DatePicker,
            'el-select': Select,
            'el-option': Option,
            'el-switch': Switch,
            'el-input': Input,
        },
        mixins: [CommandEditorMixin],
        data() {
            return {targetChange: {number: 0, ccy: ''}};
        },
        methods: {
            accountIdChanged() {
                const all = this.$store.state.summary.accounts;
                const acct = all.find(x => x.accountId === this.c.accountId);
                if (acct) {
                    this.c.change.ccy = acct.ccy;
                }
            },
            otherAccountIdChanged() {
                const all = this.$store.state.summary.accounts;
                const acct = all.find(x => x.accountId === this.c.otherAccount);
                if (acct) {
                    this.targetChange.ccy = acct.ccy;
                }
            },
            changeChanged() {
                if (!this.targetChange.ccy) {
                    this.targetChange.ccy = this.c.change.ccy;
                }
                if (this.targetChange.ccy === this.c.change.ccy) {
                    this.targetChange.number = this.c.change.number;
                }
            },
        },
        computed: {
            transferableAccounts() {
                return this.mainAccounts;
            },
            isValid() {
                const c = this.c;
                return c.accountId
                    && c.otherAccount
                    && c.change.number
                    && this.targetChange.number
                    && c.change.ccy
                    && this.targetChange.ccy;
            },
            toGainstrack() {
                if (this.isValid) {
                    const c = this.c;
                    let baseStr = `${c.date} tfr ${c.accountId} ${c.otherAccount} ${c.change.number} ${c.change.ccy}`;
                    if (c.change.number !== this.targetChange.number
                        || c.change.ccy !== this.targetChange.ccy) {
                        baseStr += ` ${this.targetChange.number} ${this.targetChange.ccy}`;
                    }
                    return baseStr;
                }
            }
        }
    }
</script>

<style scoped>

</style>
