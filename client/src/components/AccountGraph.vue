<template>
    <div>
        <apexchart type="line" :options="options" :series="series" height="250px"></apexchart>
        {{ options }}
    </div>
</template>

<script>
    import VueApexCharts from 'vue-apexcharts';
    import axios from 'axios';


    export default {
        name: 'AccountGraph',
        components: {'apexchart': VueApexCharts},
        props: ['accountId'],
        data: function() {
            return {
                options: {
                    chart: {
                        id: 'vuechart-example'
                    },
                    /*xaxis: {
                        categories: [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001]
                    }*/
                },
                series: [{
                    name: 'series-1',
                    data: [30, 40, 45, 50, 49, 60, 70, 91]
                }]
            }
        },
        mounted() {
            const self = this;
            const notify = this.$notify;
            axios.get('/api/account/' + this.accountId + '/graph')
                .then(response => {
                    self.series = response.data.series;
                    // self.options.xaxis = response.data.xaxis;
                    self.options = {
                        chart: {
                            id: 'vuechart-example'
                        },
                        xaxis: response.data.xaxis
                        // xaxis : [11991, 11992, 11993, 11994, 11995, 11996,
                        //     11997, 11998, 11999, 12000, 12001]
                    };
                })
                .catch(error => notify.error(error))
        },
    }
</script>

<style scoped>

</style>
