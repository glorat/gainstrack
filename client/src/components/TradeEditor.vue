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
            <account-selector v-model="c.accountId" :account-list="tradeableAccounts" @input="accountIdChanged"></account-selector>
        </div>
        <div>
            Purchase
            <balance-editor v-model="c.change"></balance-editor>
        </div>
        <div>
            Price
            <balance-editor v-model="c.price"></balance-editor>
        </div>
        <div>
            Commission
            <balance-editor v-model="c.commission"></balance-editor>
        </div>

    </div>
</template>

<script>
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../mixins/CommandEditorMixin';
    import {DatePicker} from 'element-ui';
    import lang from 'element-ui/lib/locale/lang/en'
    import locale from 'element-ui/lib/locale'
    import AccountSelector from './AccountSelector';
    locale.use(lang);

    export default {
        name: 'TradeEditor',
        components: {AccountSelector, BalanceEditor, 'el-date-picker': DatePicker},
        mixins: [CommandEditorMixin],
        data() {
            let c = {};
            if (this.cmd) {
                c = {...this.cmd}
            }
            c.date = c.date || new Date().toISOString().slice(0, 10);
            c.change = c.change || {number: 0, ccy: ''};
            c.price = c.price || {number: 0, ccy: ''};
            c.commission = c.commission || {number: 0, ccy: ''};
            c.accountId = c.accountId || '';
            return {c};
        },
        methods: {
            accountIdChanged() {
                const all /*: AccountDTO[]*/ = this.$store.state.summary.accounts;
                const acct = all.find(x => x.accountId === this.c.accountId);
                if (acct) {
                    // @ts-ignore
                    this.c.price.ccy = acct.ccy;
                    this.c.commission.ccy = acct.ccy;
                }
            },
        },
        computed: {
            isValid() {
                return !!this.c.accountId
                    && this.c.change.number
                    && this.c.change.ccy
                    && this.c.price.number
                    && this.c.price.ccy;
            },
            toGainstrack() {
                if (this.isValid) {
                    let baseStr = `${this.c.date} trade ${this.c.accountId} ${this.c.change.number} ${this.c.change.ccy} @${this.c.price.number} ${this.c.price.ccy}`;
                    if (this.c.commission.number && this.c.commission.ccy) {
                        baseStr += ` C${this.c.commission.number} ${this.c.commission.ccy}`
                    }
                    return baseStr
                } else {
                    return undefined;
                }

            }
        },
    }
</script>

<style scoped>

</style>
