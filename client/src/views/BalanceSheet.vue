<template>
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

</template>

<script>
    import TreeTable from '../components/TreeTable';

    export default {
        name: 'BalanceSheet',
        components: {TreeTable},
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
