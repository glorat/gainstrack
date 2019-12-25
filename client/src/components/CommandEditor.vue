<template>
    <div v-if="type === 'tfr'">
        <transfer :cmd="cmd" v-on:input="inputChanged()" v-on:gainstrack-changed="gainstrackChanged($event)"></transfer>
    </div>
    <div v-else-if="type === 'trade'">
        <trade-editor :cmd="cmd" v-on:input="inputChanged()" v-on:gainstrack-changed="gainstrackChanged($event)"></trade-editor>
    </div>
    <div v-else-if="type === 'unit'">
        <unit-command :cmd="cmd" v-on:input="inputChanged()" v-on:gainstrack-changed="gainstrackChanged($event)"></unit-command>
    </div>
    <div v-else-if="type === 'bal'">
        <balance-statement :cmd="cmd" v-on:input="inputChanged()" v-on:gainstrack-changed="gainstrackChanged($event)"></balance-statement>
    </div>
    <div v-else-if="type === 'fund'">
        <fund-command :cmd="cmd" v-on:input="inputChanged()" v-on:gainstrack-changed="gainstrackChanged($event)"></fund-command>
    </div>
    <div v-else-if="type === 'C'">
        C
    </div>
    <div v-else>
        Widget of type {{ type }} has payload {{cmd}}
    </div>
</template>

<script>
    import Transfer from './Transfer';
    import TradeEditor from './TradeEditor';
    import BalanceStatement from './BalanceStatement';
    import FundCommand from './FundCommand';
    import UnitCommand from './UnitCommand';

    export default {
        name: 'CommandEditor',
        components: {UnitCommand, FundCommand, BalanceStatement, TradeEditor, Transfer},
        methods: {
            gainstrackChanged(str) {
                this.$emit('gainstrack-changed', str);
            },
            inputChanged() {
                this.$emit('input', this.cmd);
            },
        },
        props: {cmd: Object, type: String},
    }
</script>

<style>
    .command-editor .input {
        padding: 1px 10px;
    }
</style>
