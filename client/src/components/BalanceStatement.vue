<template>
    <div>
        <input type="text" name="date" v-model="cmd.date" v-on:input="inputChanged()">
        Balance:
        <input type="text" name="account" v-model="cmd.accountId" v-on:input="inputChanged()">
        amount
        <balance-editor v-model="cmd.balance"></balance-editor>
    </div>
</template>

<script>
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../mixins/CommandEditorMixin';

    export default {
        name: 'BalanceStatement',
        props: {cmd: Object},
        mixins: [CommandEditorMixin],
        components: {BalanceEditor},
        computed: {
            toGainstrack() {
                return `${this.cmd.date} bal ${this.cmd.accountId} ${this.cmd.balance.number} ${this.cmd.balance.ccy}`;
            }
        }
    }
</script>

<style scoped>

</style>