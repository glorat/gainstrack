<template>
    <div>
        <input type="text" name="date" v-model="cmd.date" v-on:input="inputChanged()">
        Unit:
        <input type="text" name="account" v-model="cmd.accountId" v-on:input="inputChanged()">
    </div>
</template>

<script>
    import BalanceEditor from './BalanceEditor';
    import {CommandEditorMixin} from '../mixins/CommandEditorMixin';

    export default {
        name: 'UnitCommand',
        mixins: [CommandEditorMixin],
        components: {BalanceEditor},
        computed: {
            toGainstrack() {
                return `${this.cmd.date} unit ${this.cmd.accountId} TODO`;
            }
        }
    }
</script>

<style scoped>

</style>