<template>
    <div>
        <input type="text" name="date" v-model="myCmd.date" v-on:input="inputChanged()">
        Balance:
        <input type="text" name="account" v-model="myCmd.accountId" v-on:input="inputChanged()">
        amount
        <balance-editor v-model="myCmd.balance"></balance-editor>
    </div>
</template>

<script>
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../mixins/CommandEditorMixin';
    import {cloneDeep} from "lodash";

    export default {
        name: 'BalanceStatement',
        props: {cmd: Object},
        mixins: [CommandEditorMixin],
        components: {BalanceEditor},
        data() {
            let myVal;
            if (this.cmd) {
                myVal = cloneDeep(this.cmd)
            } else {
                myVal = {date: '2000-01-01', accountId: '', balance: {number: 0.0, ccy: 'USD'}};
            }

            return {
                myCmd: myVal
            }
        },
        computed: {
            toGainstrack() {
                return `${this.myCmd.date} bal ${this.myCmd.accountId} ${this.myCmd.balance.number} ${this.myCmd.balance.ccy}`;
            }
        }
    }
</script>

<style scoped>

</style>