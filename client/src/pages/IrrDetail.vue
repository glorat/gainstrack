<template>
    <div>
        <h3>Investment cashflows for <router-link :to="{name:'account', params:{accountId:accountId}}">{{accountId}}</router-link></h3>
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
    </div>
</template>

<script>
    import axios from 'axios';

    export default {
        name: 'IrrDetail',
        props: ['accountId'],
        data() {
            return {detail: []}
        },
        mounted() {
            const notify = this.$notify;
            axios.get('/api/irr/' + this.accountId)
                .then(response => this.detail = response.data)
                .catch(error => notify.error(error))
        },
    }
</script>

<style scoped>

</style>
