<template>
    <my-page padding>
        <h6>Investment cashflows for <router-link :to="{name:'account', params:{accountId:accountId}}">{{accountId}}</router-link></h6>
        <table class="queryresults sortable">
            <thead>
            <tr>
                <th data-sort="string">account</th>
                <th data-sort="num">date</th>
                <th data-sort="num">value</th>
                <th data-sort="num">cvalue</th>
                <th data-sort="string">source</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(date,index) in detail.dates">
                <td>
                    {{ accountId}}
                </td>
                <td class="string">{{ date }}</td>
                <td class="num" v-bind:data-sort-value="detail.values[index]">{{ detail.values[index]}} {{ detail.units[index]}}</td>
                <td class="num" v-bind:data-sort-value="detail.cvalues[index]">{{ detail.cvalues[index]}}</td>

                <td class="string">{{ detail.description[index] }}</td>
            </tr>
            </tbody>
        </table>
    </my-page>
</template>

<script>
  import { mapGetters } from 'vuex'
  import { apiIrrDetail } from 'src/lib/apiFacade'

  export default {
        name: 'IrrDetail',
        props: ['accountId'],
        data() {
            return {detail: []}
        },
      methods: {
        async refresh() {
          const notify = this.$notify;
          try {
            this.detail = await apiIrrDetail(this.$store, this.$props);
          } catch (error) {
            console.log(error);
            notify.error(error);
          }
        }
      },
      computed: {
        ...mapGetters([
          'baseCcy',
          'allPostingsEx',
          'allTxs',
          'fxConverter',
          'mainAccounts',
          'mainAssetAccounts',
        ]),
      },
      mounted() {
        this.refresh()
      },
    }
</script>

<style scoped>

</style>
