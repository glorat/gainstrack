<template>
    <div class="row">
        <div class="column">
            <h3>Assets</h3>
            <tree-table v-bind:node="info['Income']"></tree-table>
        </div>
        <div class="column">
            <h3>Liabilities</h3>
            <tree-table v-bind:node="info['Expenses']"></tree-table>
        </div>
    </div>
</template>

<script>
    import TreeTable from '../components/TreeTable';

    export default {
        name: 'IncomeStatement',
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
