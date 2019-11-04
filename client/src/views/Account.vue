<template>
<div>

    <h3><a href="/gainstrack/command/get/">{{ accountId }}</a></h3>
    <div>
        <account-graph :accountId="accountId"></account-graph>
    </div>
    <div>
        <conversion-select></conversion-select>
    </div>

    <journal-table :entries="info.rows" show-balance></journal-table>
</div>
</template>

<script>
    import axios from 'axios';
    import JournalTable from '@/components/JournalTable';
    import ConversionSelect from '@/components/ConversionSelect';
    import AccountGraph from '@/components/AccountGraph';

    export default {
        name: 'Account',
        components: {AccountGraph, ConversionSelect, JournalTable},
        props: ['accountId'],
        data() {
            return {
                info: {accountId: 'Loading...', rows: []},
            };
        },
        computed: {
            conversion() {
                return this.$store.state.summary.conversion;
            }
        },
        watch: {
            conversion() {
                this.refresh();
            }
        },
        methods: {
          refresh() {
              axios.get('/api/account/' + this.accountId)
                  .then(response => this.info = response.data)
                  .catch(error => this.$notify.error(error))
          }
        },
        mounted() {
            this.refresh();
        },
    }
</script>

<style scoped>

</style>
