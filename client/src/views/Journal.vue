<template>
    <div>
        <journal-table :entries="info.rows"></journal-table>
    </div>
</template>

<script>
    import axios from 'axios';
    import JournalTable from '@/components/JournalTable';

    export default {
        name: 'Journal',
        components: {JournalTable},
        props: ['accountId'],
        data() {
            return {
                info: {rows: []},
            };
        },
        mounted() {
            axios.get('/api/journal/')
                .then(response => this.info = response.data)
                .catch(error => this.$notify.error(error))
        },
    }
</script>

<style scoped>

</style>
