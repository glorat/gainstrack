<template>
    <div>
        <input type="text" v-model="cmd.date">
        <input type="text" v-model="cmd.accountId">
        <balance-editor v-model="cmd.change"></balance-editor>
        @<balance-editor v-model="cmd.price"></balance-editor>
        c<balance-editor v-model="cmd.commission"></balance-editor>
    </div>
</template>

<script>
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../mixins/CommandEditorMixin';

    export default {
        name: 'TradeEditor',
        components: {BalanceEditor},
        mixins: [CommandEditorMixin],
        computed: {
            toGainstrack() {
                const baseStr = `${this.cmd.date} trade ${this.cmd.accountId} ${this.cmd.change.number} ${this.cmd.change.ccy} @${this.cmd.price.number} ${this.cmd.price.ccy} C${this.cmd.commission.number} ${this.cmd.commission.ccy}`;
                return baseStr
            }
        },
    }
</script>

<style scoped>

</style>
