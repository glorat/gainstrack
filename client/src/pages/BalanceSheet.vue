<template>
    <my-page padding>
        <div>
            <account-graph :key="conversion" accountId="Assets"></account-graph>
        </div>
        <div>
            <conversion-select></conversion-select>
        </div>
        <div class="row">
            <div class="col-md-6">
                <h5 id="assets-table">Assets</h5>
                <tree-table v-bind:node="info['Assets']"></tree-table>
            </div>
            <div class="col-md-6">
                <h5>Liabilities</h5>
                <tree-table v-bind:node="info['Liabilities']"></tree-table>
                <h5>Equity</h5>
                <tree-table v-bind:node="info['Equity']"></tree-table>
            </div>
        </div>
    </my-page>
</template>

<script>
    import TreeTable from 'src/components/TreeTable.vue';
    import ConversionSelect from 'src/components/ConversionSelect.vue';
    import AccountGraph from 'src/components/AccountGraph.vue';

    export default {
        name: 'BalanceSheet',
        components: {AccountGraph, ConversionSelect, TreeTable},
        data() {
            return {};
        },
        computed: {
            info() {
                return this.$store.state.balances
            },
            conversion() {
                return this.$store.state.summary.conversion;
            },
        },
        mounted() {
            this.$store.dispatch('balances')
                .catch(error => this.$notify.error(error))
        },
    }
</script>

<style scoped>

</style>
