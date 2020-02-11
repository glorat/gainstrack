<template>
    <table class="queryresults sortable">
        <thead>
        <tr>
            <th data-sort="string">account</th>
            <th data-sort="string">date</th>
            <th data-sort="string">type</th>
            <th>asset</th>
            <th>change</th>
            <th>price</th>
            <th>commission</th>
            <th>balance</th>
            <th>other account</th>
            <th data-sort="string">description</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="cmd in cmds" v-on:click="selectCommand(cmd)">
            <!--            <td colspan="4"><command-editor :cmd="cmd.data" :type="cmd.type"></command-editor></td>-->
            <td>{{ cmd.accountId }}</td>
            <td>{{ cmd.date }}</td>
            <td>{{ cmd.commandType }}</td>
            <td>{{ cmd.asset }}</td>
            <td class="num">{{ cmd.change | amount }}</td>
            <td class="num">{{ cmd.price | amount }}</td>
            <td class="num">{{ cmd.commission | amount }}</td>
            <td class="num">{{ cmd.balance | amount }}</td>
            <td>{{ cmd.otherAccount }}</td>
            <td>{{ cmd.description }}</td>
        </tr>
        </tbody>
    </table>
</template>

<script>
    export default {
        name: 'CommandTable',
        props: {cmds: Array},
        filters: {
            amount(value) {
                if (!value) {
                    return ''
                } else {
                    return `${value.number} ${value.ccy}`
                }

            }
        },
        methods: {
            selectCommand(cmd) {
                // this.selectedCommand = cloneDeep(cmd);
            },
        }
    }
</script>

<style scoped>

</style>