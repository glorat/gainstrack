<template>

    <table class="queryresults sortable">
        <thead>
        <tr>
            <th data-sort="string">account</th>
            <th data-sort="num">balance</th>
            <th data-sort="num">start</th>
            <th data-sort="num">end</th>
            <th data-sort="num">irr</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="row in info">
            <td><router-link :to="{ name: 'irr_detail', params: { accountId: row.accountId }}">{{ row.accountId }}</router-link></td>
            <td class="num">{{row.endBalance}}</td>
            <td class="num" v-bind:data-sort-value="row.start">{{ row.start }}</td>
            <td class="num" v-bind:data-sort-value="row.end">{{ row.end }}</td>
            <td class="num">{{ row.irr | numeral("0.00%")}}</td>
        </tr>
        </tbody>
    </table>
</template>

<script>
    import axios from 'axios';

    export default {
        name: "IrrSummary",
        data() {
            return {info:[]}
        },
        mounted () {
            const notify = this.$notify;
            axios.get('/api/irr/')
                .then(response => this.info = response.data)
                .catch(error => notify.error(error))
        },
    }
</script>

<style scoped>

</style>
