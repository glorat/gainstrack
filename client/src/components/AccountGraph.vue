<template>
    <div>
        <apexchart type="line" :options="options" :series="series" height="250px"></apexchart>
    </div>
</template>

<script>
    import VueApexCharts from 'vue-apexcharts';
    import axios from 'axios';

    const expMovingAverage = function(array, range) {
        const k = 2/(range + 1);
        // first item is just the same as the first item in the input
        let emaArray = [array[0]];
        // for the rest of the items, they are computed with the previous one
        for (let i = 1; i < array.length; i++) {
            emaArray.push({
                x:array[i].x,
                y:array[i].y * k + emaArray[i - 1].y * (1 - k)
            });
        }
        return emaArray;
    };

    export default {
        name: 'AccountGraph',
        components: {apexchart: VueApexCharts},
        props: ['accountId'],
        data() {
            return {
                options: {
                    chart: {
                        id: 'vuechart-account-graph',
                        type: 'area',
                        stacked: false,
                        zoom: {
                            type: 'x',
                            enabled: true,
                            autoScaleYaxis: true
                        },
                        toolbar: {
                            autoSelected: 'zoom'
                        }
                    },
                    dataLabels: {
                        enabled: false
                    },
                    title: {
                        text: ''
                    },
                    xaxis: {type: 'datetime'},
                    yaxis: {
                        labels: {
                            formatter(val) {
                                return val.toFixed(0);
                            },
                        },
                        min(y) {
                            return y>0 ? 0 : y;
                        },
                        forceNiceScale: true,
                    },
                },
                series: [{
                    name: 'series-1',
                    data: []
                }]
            }
        },
        mounted() {
            const self = this;
            const notify = this.$notify;
            axios.get('/api/account/' + this.accountId + '/graph')
                .then(response => {
                    const series = response.data.series;
                    const smoothSeries = series.map(s => {
                        const smoothData = expMovingAverage(s.data, 12);
                        s.data = smoothData;
                        return s;
                    });
                    self.series = smoothSeries;
                })
                .catch(error => notify.error(error))
        },
    }
</script>

<style scoped>

</style>
