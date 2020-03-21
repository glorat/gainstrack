<template>
<div>

    <h6><a href="/gainstrack/command/get/">{{ accountId }}</a></h6>
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
    import JournalTable from '@/components/JournalTable.vue';
    import ConversionSelect from '@/components/ConversionSelect.vue';
    import AccountGraph from '@/components/AccountGraph.vue';

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
                this.refresh(this.accountId);
            }
        },
        methods: {
          refresh(path) {
              axios.get('/api/account/' + path)
                  .then(response => this.info = response.data)
                  .catch(error => this.$notify.error(error))
          }
        },
        mounted() {
            this.refresh(this.accountId);
        },
        beforeRouteUpdate(to, from, next) {
            // react to route changes...
            // don't forget to call next()
            this.refresh(to.params.accountId);
            next();
        }
    }
</script>

<style scoped>

</style>
