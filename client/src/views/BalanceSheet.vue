<template>
    <div>
        <div>
            <account-graph accountId="Assets"></account-graph>
        </div>
        <div>
            <conversion-select></conversion-select>
        </div>
        <div class="row">
            <div class="column">
                <h3>Assets</h3>
                <tree-table v-bind:node="info['Assets']"></tree-table>
            </div>
            <div class="column">
                <h3>Liabilities</h3>
                <tree-table v-bind:node="info['Liabilities']"></tree-table>
                <h3>Equity</h3>
                <tree-table v-bind:node="info['Equity']"></tree-table>
            </div>
        </div>
    </div>
</template>

<script>
    import TreeTable from '../components/TreeTable';
    import ConversionSelect from '@/components/ConversionSelect';
    import AccountGraph from '../components/AccountGraph';

    export default {
        name: 'BalanceSheet',
        components: {AccountGraph, ConversionSelect, TreeTable},
        data() {
            return {};
        },
        computed: {
            info() {
                return this.$store.state.balances
            }
        },
        mounted() {
            this.$store.dispatch('balances')
                .catch(error => this.$notify.error(error))
        },
    }
</script>

<style scoped>

</style>
