<template>
    <my-page padding>
        <table class="queryresults sortable">
            <thead>
            <tr>
                <th data-sort="string">account</th>
            </tr>
            </thead>
            <tbody>
            <tr v-bind:key="acctId" v-for="acctId in mainAccounts">
                <td class="account-entry" :tag="acctId"><router-link :to="{name:'command', params:{accountId:acctId }}">{{ acctId }}</router-link> </td>
            </tr>
            </tbody>
        </table>
    </my-page>
</template>

<script>
    import axios from 'axios';
    import {mapGetters} from 'vuex';
    import AccountCreation from '../components/command/AccountCreation';

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
        computed: {
            ...mapGetters(['mainAccounts']),
        },
    }
</script>

<style scoped>

</style>
