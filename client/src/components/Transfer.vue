<template>
    <div>
        <input type="text" name="date" v-model="cmd.date" v-on:input="inputChanged()">
        Transfer:
        <input type="text" name="source" v-model="cmd.source" v-on:input="inputChanged()">
        amount
        <balance-editor v-model="cmd.sourceValue" v-on:input="inputChanged()"></balance-editor>
        to
        <input type="text" name="dest" v-model="cmd.dest" v-on:input="inputChanged()">
        value
        <balance-editor v-model="cmd.targetValue" v-on:input="inputChanged()"></balance-editor>
    </div>
</template>

<script>
    import BalanceEditor from './BalanceEditor.vue';
    import {CommandEditorMixin} from '../mixins/CommandEditorMixin';

    export default {
        name: 'Transfer',
        props: {cmd: Object},
        components: {BalanceEditor},
        mixins: [CommandEditorMixin],
        computed: {
            toGainstrack() {
                let baseStr = `${this.cmd.date} tfr ${this.cmd.source} ${this.cmd.dest} ${this.cmd.sourceValue.number} ${this.cmd.sourceValue.ccy}`;
                if (this.cmd.sourceValue.number !== this.cmd.targetValue.number
                    || this.cmd.sourceValue.ccy !== this.cmd.targetValue.ccy) {
                    baseStr += ` ${this.cmd.targetValue.number} ${this.cmd.targetValue.ccy}`;
                }
                return baseStr
            }
        }
    }
</script>

<style scoped>

</style>
