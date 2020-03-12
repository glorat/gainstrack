<template>
    <div v-if="type === 'tfr'">
        <transfer :cmd="input" v-on:input="inputChanged()" v-on:gainstrack-changed="gainstrackChanged($event)"></transfer>
    </div>
    <div v-else-if="type === 'trade'">
        <trade-editor :cmd="input" v-on:input="inputChanged()" v-on:gainstrack-changed="gainstrackChanged($event)"></trade-editor>
    </div>
    <div v-else-if="type === 'unit'">
        <unit-command :cmd="input" v-on:input="inputChanged()" v-on:gainstrack-changed="gainstrackChanged($event)"></unit-command>
    </div>
    <div v-else-if="type === 'bal'">
        <balance-statement :cmd="input" v-on:input="inputChanged()" v-on:gainstrack-changed="gainstrackChanged($event)"></balance-statement>
    </div>
    <div v-else-if="type === 'fund'">
        <fund-command :cmd="input" v-on:input="inputChanged()" v-on:gainstrack-changed="gainstrackChanged($event)"></fund-command>
    </div>
    <div v-else-if="type === 'open'">
        <account-creation :cmd="input" v-on:input="inputChanged()" v-on:gainstrack-changed="gainstrackChanged($event)"></account-creation>
    </div>
    <div v-else-if="type === 'earn'">
        <earn-editor :cmd="input" v-on:input="inputChanged()" v-on:gainstrack-changed="gainstrackChanged($event)"></earn-editor>
    </div>
    <div v-else-if="type === 'spend'">
        <spend-editor :cmd="input" v-on:input="inputChanged()" v-on:gainstrack-changed="gainstrackChanged($event)"></spend-editor>
    </div>
    <div v-else-if="type === 'yield'">
        <yield-editor :cmd="input" v-on:input="inputChanged()" v-on:gainstrack-changed="gainstrackChanged($event)"></yield-editor>
    </div>
    <div v-else-if="type === 'C'">
        C
    </div>
    <div v-else>
        Editor for {{type}} is under construction
    </div>
</template>

<script>
    import Transfer from './command/Transfer';
    import TradeEditor from './command/TradeEditor';
    import BalanceStatement from './command/BalanceStatement';
    import FundCommand from './command/FundCommand';
    import UnitCommand from './command/UnitCommand';
    import AccountCreation from './command/AccountCreation';
    import EarnEditor from './command/EarnEditor';
    import YieldEditor from './command/YieldEditor';
    import SpendEditor from '@/components/command/SpendEditor';

    export default {
        name: 'CommandEditor',
        components: {
            YieldEditor,
            SpendEditor, EarnEditor, UnitCommand, FundCommand, BalanceStatement, TradeEditor, Transfer, AccountCreation},
        methods: {
            gainstrackChanged(str) {
                this.$emit('gainstrack-changed', str);
            },
            inputChanged() {
                this.$emit('input', this.input);
            },
        },
        computed: {
            type() {
                return this.input.commandType;
            }
        },
        props: {input: Object},
    }
</script>

<style>
    .command-editor .input {
        padding: 1px 10px;
    }
</style>
