<template>
    <div>
        <apexchart type="line" :options="options" :series="series" height="250px"></apexchart>
    </div>
</template>

<script>
    import VueApexCharts from 'vue-apexcharts';
    import axios from 'axios';


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
                            formatter: function (val) {
                                return val.toFixed(0);
                            },
                        },
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
                    self.series = response.data.series;
                })
                .catch(error => notify.error(error))
        },
    }
</script>

<style scoped>

</style>
