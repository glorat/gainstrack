<template>
    <my-page padding>
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
            <tr v-bind:key="row.accountId" v-for="row in info">
                <td><router-link :to="{ name: 'irr_detail', params: { accountId: row.accountId }}">{{ row.accountId }}</router-link></td>
                <td class="num">{{row.endBalance}}</td>
                <td class="num" v-bind:data-sort-value="row.start">{{ row.start }}</td>
                <td class="num" v-bind:data-sort-value="row.end">{{ row.end }}</td>
                <td class="num">{{ row.irr | numeral("0.00%")}}</td>
            </tr>
            </tbody>
        </table>
    </my-page>

</template>

<script>
  import numbro from 'numbro'
  import { apiIrrSummary } from 'src/lib/apiFacade'
  import { mapGetters } from 'vuex'

  export default {
    name: 'IrrSummary',
    data () {
      return { info: [] }
    },
    filters: {
      numeral: (value, format) => numbro(value).format(format)
    },
    methods: {
      async refresh () {
        const notify = this.$notify;
        try {
          this.info = await apiIrrSummary(this.$store)
        } catch (error) {
          console.error(error);
          notify.error(error)
        }
      }
    },
    computed: {
      ...mapGetters([,
        'fxConverter',
      ]),
    },
    watch: {
      fxConverter () {
        this.refresh()
      }
    },
  }
</script>

<style scoped>

</style>
