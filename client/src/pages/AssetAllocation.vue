<template>
    <my-page padding>
       <vue-plotly :data="treeData" :layout="treeLayout" :options="treeOptions" auto-resize></vue-plotly>

        <div class="row">
            <div class="column" v-for="table in tables">
                <h3>{{ table.name }}</h3>
                <tree-table v-bind:node="table.rows"></tree-table>
            </div>
        </div>



    </my-page>
</template>

<script>

    import VuePlotly from '../components/Plotly'
    import axios from 'axios';
    import TreeTable from '../components/TreeTable';

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
                    // @ts-ignore
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
            const self = this;
            const notify = this.$notify;

            axios.get('/api/aa/tree')
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

                    self.treeData = plotlys;

                })
                .catch(error => notify.error(error));



            axios.get('/api/aa/table')
                .then(response => {
                    self.tables = response.data;
                })
                .catch(error => notify.error(error));
        },
    }
</script>

<style scoped>

</style>
