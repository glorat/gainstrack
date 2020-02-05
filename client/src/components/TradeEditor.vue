<template>
    <div>
        <el-date-picker
                v-model="c.date"
                type="date"
                value-format="yyyy-MM-dd"
                size="mini"
                :clearable="false"
        >
        </el-date-picker>
        <account-selector v-model="c.accountId" :account-list="tradeableAccounts"></account-selector>
        Purchase
        <balance-editor v-model="c.change"></balance-editor>
        Price
        @<balance-editor v-model="c.price"></balance-editor>
        Commission
        c<balance-editor v-model="c.commission"></balance-editor>
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
        computed: {
            isValid() {
                return !!this.c.accountId
                    && this.c.change.number
                    && this.c.change.ccy
                    && this.c.price.number
                    && this.c.price.ccy;
            },
            tradeableAccounts() {
                const all = this.$store.state.summary.accounts;
                const scope = all.filter(x => x.key.name.startsWith('Asset') && x.options.multiAsset);
                return scope.map(x => x.key.name).sort();
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
