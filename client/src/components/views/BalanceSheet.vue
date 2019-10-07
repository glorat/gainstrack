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
    import TreeTable from "../TreeTable";
    import axios from 'axios';

    export default {
        name: "BalanceSheet",
        components: {TreeTable},
        data() {
            return {info : {}};
        },
        mounted () {
            axios.get('/api/balance_sheet/')
                .then(response => this.info = response.data)
                .catch(error => console.log(error))
        },
    }
</script>

<style scoped>

</style>
