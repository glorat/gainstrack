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
    import TreeTable from "../TreeTable";
    import axios from 'axios';

    export default {
        name: "IncomeStatement",
        components: {TreeTable},
        data() {
            return {info : {}};
        },
        mounted () {
            axios.get('/api/income_statement/')
                .then(response => this.info = response.data)
                .catch(error => console.log(error))
        },
    }
</script>

<style scoped>

</style>
