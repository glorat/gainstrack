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
                <td class="account-entry" :tag="acctId"><router-link :to="{name:'account', params:{accountId:acctId }}">{{ acctId }}</router-link> </td>
            </tr>
            </tbody>
        </table>
    </my-page>
</template>

<script>
    import {mapGetters} from 'vuex';

    export default {
        name: 'CommandSummary',
        data() {
            return {}
        },
        computed: {
            ...mapGetters(['mainAccounts']),
        },
    }
</script>

<style scoped>

</style>
