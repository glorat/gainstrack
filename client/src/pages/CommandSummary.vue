<template>
    <table class="queryresults sortable">
        <thead>
        <tr>
            <th data-sort="string">account</th>
        </tr>
        </thead>
        <tbody>
        <tr v-bind:key="acct.accountId" v-for="acct in info">
            <td><router-link :to="{name:'command', params:{accountId:acct.key.name }}">{{ acct.key.name }}</router-link> </td>
        </tr>
        </tbody>
    </table>
</template>

<script>
    import AccountCreation from '../models';
    import axios from 'axios';

    export default {
        name: 'CommandSummary',
        data() {
            return {info: Array < AccountCreation > []}
        },
        mounted() {
            axios.get('/api/command/')
                .then(response => this.info = response.data)
                .catch(error => this.$notify.error(error))
        },
    }
</script>

<style scoped>

</style>
