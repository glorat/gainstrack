<template>
    <vue-plotly :data="data" :layout="layout" :options="options" auto-resize></vue-plotly>
</template>

<script>
    import axios from 'axios';
    import VuePlotly from './Plotly'

    const expMovingAverage = (array, range) => {
        const k = 2 / (range + 1);
        // first item is just the same as the first item in the input
        const emaArray = [array[0]];
        // for the rest of the items, they are computed with the previous one
        for (let i = 1; i < array.length; i++) {
            emaArray.push({
                x: array[i].x,
                y: array[i].y * k + emaArray[i - 1].y * (1 - k)
            });
        }
        return emaArray;
    };

    function unpack(rows, key) {
        return rows.map(function(row) { return row[key]; });
    }

    export default {
        name: 'AccountGraph',
        components: {VuePlotly},
        props: ['accountId'],
        data() {
            return {
                // plotly
                // data: [{x: [1, 2, 3, 4, 5], y: [2, 4, 6, 8, 9]}],
                data: [],
                layout: {
                    autosize: true,
                    showlegend: true,
                    xaxis: {nticks: 20},
                    yaxis: {zeroline: true, hoverformat: ',.0f'},
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
            }
        },
        mounted() {
            const self = this;
            const notify = this.$notify;
            axios.get('/api/account/' + this.accountId + '/graph')
                .then(response => {
                    const series = response.data.series;
                    let plotlys = [];

                    const smoothSeries = series.map(s => {
                        const smoothData = expMovingAverage(s.data, 12);
                        const plotly = {
                            type: "scatter",
                            name: s.name,
                            x: unpack(smoothData, 'x'),
                            y:unpack(smoothData, 'y')};
                        plotlys.push(plotly);
                        return s;
                    });

                    self.data = plotlys;
                })
                .catch(error => notify.error(error))
        },
    }
</script>

<style scoped>

</style>
