<template>
  <my-page padding>
    <div>
      <conversion-select></conversion-select>
    </div>
    <div class="row">
      <div class="column">
        <h5>Income</h5>
        <tree-table v-bind:node="info['Income']"></tree-table>
      </div>
      <div class="column">
        <h5>Expenses</h5>
        <tree-table v-bind:node="info['Expenses']"></tree-table>
      </div>
    </div>
  </my-page>
</template>

<script>
  import TreeTable from '../components/TreeTable'
  import ConversionSelect from '../components/ConversionSelect'

  export default {
    name: 'IncomeStatement',
    components: {
      ConversionSelect,
      TreeTable
    },
    data () {
      return {}
    },
    computed: {
      info () {
        return this.$store.state.balances
      }
    },
    mounted () {
      this.$store.dispatch('balances')
        .catch(error => this.$notify.error(error))
    },
  }
</script>

<style scoped>

</style>
