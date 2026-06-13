<template>
    <my-page padding>
        <div>
<!--            <account-graph :key="conversion" accountId="Assets"></account-graph>-->
          <networth-sunburst :height="200" :key="conversion"></networth-sunburst>
        </div>
        <div>
            <conversion-select></conversion-select>
        </div>
        <div class="row">
            <div class="col-md-6">
                <h5 id="assets-table">Assets</h5>
                <tree-table v-bind:node="info['Assets']"></tree-table>
            </div>
            <div class="col-md-6">
                <h5>Liabilities</h5>
                <tree-table v-bind:node="info['Liabilities']"></tree-table>
                <h5>Equity</h5>
                <tree-table v-bind:node="info['Equities']"></tree-table>
            </div>
        </div>
    </my-page>
</template>

<script>
    import TreeTable from 'src/components/TreeTable.vue';
    import ConversionSelect from 'src/components/ConversionSelect.vue';
    import AccountGraph from 'src/components/AccountGraph.vue';
    import NetworthSunburst from 'components/NetworthSunburst.vue';

    import {useAppStore} from 'src/stores';

    export default {
        name: 'BalanceSheet',
      // eslint-disable-next-line vue/no-unused-components
        components: {AccountGraph, ConversionSelect, TreeTable, NetworthSunburst},
        setup() { return { store: useAppStore() } },
        data() {
            return {};
        },
        computed: {
            info() {
                return this.store.balances
            },
            conversion() {
                return this.store.allState.conversion;
            },
        },
        mounted() {
            this.store.computeBalances()
                .catch(error => this.$notify.error(error))
        },
    }
</script>

<style scoped>

</style>
