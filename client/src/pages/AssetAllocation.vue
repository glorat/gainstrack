<template>
    <my-page padding>
       <vue-plotly :data="treeData" :layout="treeLayout" :options="treeOptions" auto-resize></vue-plotly>

        <div class="row">
            <div class="col-md-6" v-for="table in tables">
                <h6>{{ table.name }}</h6>
                <tree-table v-bind:node="table.rows"></tree-table>
            </div>
        </div>

    </my-page>
</template>

<script>

    import axios from 'axios';
    import TreeTable from '../components/TreeTable';
    import { VuePlotly } from '../lib/loader'

    export default {
        name: 'AssetAllocation',
        components: {TreeTable, VuePlotly},
        data() {
            return {
                treeData: [{
                    type: 'sunburst',
                    ids: [
                        'loading'
                    ],
                    labels: [
                        'Loading'
                    ],
                    parents: [
                        ''
                    ],
                }],
                treeLayout: {
                    autosize: true,
                    margin: {l: 0, r: 0, b: 0, t: 0},
                    sunburstcolorway: ['#636efa', '#ef553b', '#00cc96'],
                },
                treeOptions: {
                    displaylogo: false
                },
                // table
                tables: [],
            }
        },
        mounted() {
            const notify = this.$notify;

            axios.post('/api/aa/tree')
                .then(response => {
                    const data = response.data;

                    const plotlys = [{
                        ...data,
                        type: 'sunburst',
                        name: 'Networth',
                        branchvalues: 'total',
                        hovertemplate: '%{label}<br>%{value:,f}<br>%{percentParent:.1%}<br>%{percentRoot:.1%}',

                    }];
                    // Root element doesn't accept percentParent so we stub out the template
                    const ts = Array(plotlys[0].ids.length).fill('%{label}<br>%{percentParent:.1%}');
                    ts.unshift('Networth');
                    plotlys[0].texttemplate = ts;

                    this.treeData = plotlys;

                })
                .catch(error => notify.error(error));



            axios.post('/api/aa/table')
                .then(response => {
                    this.tables = response.data;
                })
                .catch(error => notify.error(error));
        },
    }
</script>

<style scoped>

</style>
