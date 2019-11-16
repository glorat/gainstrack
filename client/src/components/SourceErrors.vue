<template>
    <div>
        <table v-if="errors.length>0" class="errors sortable">
            <thead>
            <tr>
                <th data-sort="num">Line</th>
                <th data-sort="string">Error</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="error in errors" >
                <td class="num">
                    <a class="source" href="">{{ error.line }}</a>
                </td>
                <td @click="onRowClick(error)">{{ error.message }}</td>
            </tr>
            </tbody>
        </table>
        <p v-else>
            No errors
        </p>
    </div>
</template>

<script>
    export default {
        name: 'SourceErrors',
        computed: {
            errors() {
                return this.$store.state.parseState.errors;
            }
        },
        methods: {
            onRowClick(error) {
                this.$router.push({ path: 'editor', query: { line: error.line } });
            }
        }
    }
</script>

<style scoped>

</style>
