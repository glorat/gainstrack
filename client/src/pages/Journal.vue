<template>
  <my-page padding>
    <h5>Journal</h5>
    <p>Shows all your transactions you have made. Change column shows the impact to your networth as at the time the
      transaction occurred</p>
    <journal-table :entries="info.rows" show-balance></journal-table>
  </my-page>
</template>

<script>
  import axios from 'axios'
  import JournalTable from '../components/JournalTable'

  export default {
    name: 'Journal',
    components: { JournalTable },
    props: ['accountId'],
    data () {
      return {
        info: { rows: [] },
      }
    },
    mounted () {
      axios.get('/api/journal/')
        .then(response => this.info = response.data)
        .catch(error => this.$notify.error(error))
    },
  }
</script>

<style>

</style>
