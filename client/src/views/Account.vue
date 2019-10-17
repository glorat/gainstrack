<template>
<div>

    <h3><a href="/gainstrack/command/get/">{{ info.accountId }}</a></h3>

    <journal-table :entries="info.rows"></journal-table>
</div>
</template>

<script>
    import axios from 'axios';
    import JournalTable from '@/components/JournalTable';

    export default {
        name: 'Account',
        components: {JournalTable},
        props: ['accountId'],
        data() {
            return {
                info: {accountId: 'Loading...', rows: []},
            };
        },
        mounted() {
            axios.get('/api/account/' + this.accountId)
                .then(response => this.info = response.data)
                .catch(error => this.$notify.error(error))
        },
    }
</script>

<style scoped>

</style>
