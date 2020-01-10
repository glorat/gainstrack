<template>
    <div>
        <vue-plotly :data="data" :layout="layout" :options="options" auto-resize></vue-plotly>

        <div class="row">
            <div class="column" v-for="table in tables">
                <h3>{{ table.name }}</h3>
                <tree-table v-bind:node="table.rows"></tree-table>
            </div>
        </div>



    </div>
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
                // plotly
                // data: [{x: [1, 2, 3, 4, 5], y: [2, 4, 6, 8, 9]}],
                data: [{
                    type: "sunburst",
                    labels: ["Loading"],
                    parents: [""],
                    values: [0],
                    // labels: ["Eve", "Cain", "Seth", "Enos", "Noam", "Abel", "Awan", "Enoch", "Azura"],
                    // parents: ["", "Eve", "Eve", "Seth", "Seth", "Eve", "Eve", "Awan", "Eve" ],
                    // values:  [10, 14, 12, 10, 2, 6, 6, 4, 4],
                    // outsidetextfont: {size: 20, color: "#377eb8"},
                    // leaf: {opacity: 0.4},
                    // marker: {line: {width: 2}},
                }],
                layout: {
                    autosize: true,
                    // showlegend: true,
                    // xaxis: {nticks: 20},
                    // yaxis: {zeroline: true, hoverformat: ',.0f'},
                    height: 250,
                    margin: {
                        l: 30,
                        r: 30,
                        b: 30,
                        t: 30,
                        pad: 0
                    },
                },
                options:{},
                // table
                tables: [],
            }
        },
        mounted() {
            const self = this;
            const notify = this.$notify;
            axios.get('/api/aa')
                .then(response => {
                    const data = response.data;

                    const plotlys = [{
                        type: 'pie',
                        labels: data.labels,
                        parents: data.labels.map(x => ''),
                        values: data.series,
                        hole: 0.6,
                        name: data.ccy,
                        // textinfo: "label+percent",
                        // labels: ["Eve", "Cain", "Seth", "Enos", "Noam", "Abel", "Awan", "Enoch", "Azura"],
                        // parents: ["", "Eve", "Eve", "Seth", "Seth", "Eve", "Eve", "Awan", "Eve" ],
                        // values:  [10, 14, 12, 10, 2, 6, 6, 4, 4],
                        // outsidetextfont: {size: 20, color: "#377eb8"},
                        // leaf: {opacity: 0.4},
                        // marker: {line: {width: 2}},
                    }];
                    self.data = plotlys;

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
