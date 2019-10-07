<template>
<div>

    <h3><a href="/gainstrack/command/get/">{{ info.accountId }}</a></h3>

    <table class="queryresults sortable">
        <thead>
        <tr>
            <th data-sort="string">Date</th>
            <th data-sort="string">Type</th>
            <th data-sort="string">Description</th>
            <th data-sort="number">Change</th>
            <th data-sort="number">Balance</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="row in info.rows">
            <td>{{ row.date }}</td>
            <td>{{ row.cmdType }}</td>
            <td>{{ row.description }}</td>
            <td class="num">{{ row.change }} </td>
            <td class="num">{{ row.position }}</td>
        </tr>
        </tbody>
    </table>

</div>
</template>

<script>
    import axios from 'axios';

    export default {
        name: "Account",
        props: ['accountId'],
        data() {
            return {info : {accountId:'Loading...', rows:[]}};
        },
        mounted () {
            axios.get('/api/account/' + this.accountId)
                .then(response => this.info = response.data)
                .catch(error => console.log(error))
        },
    }
</script>

<style scoped>

</style>
