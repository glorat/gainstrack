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
            <tr v-for="error in errors" @click="onRowClick(error)">
                <td class="num">
                    <span class="source">{{ error.line }}</span>
                </td>
                <td >{{ error.message }}</td>
            </tr>
            </tbody>
        </table>
        <p v-else>
            No errors
        </p>
    </div>
</template>

<script lang="ts">
    import {defineComponent} from 'vue'

    interface MyError {
        line: number
        message: string
    }

    export default defineComponent({
        name: 'SourceErrors',
        props: {errs: Array as () => MyError[]},
        computed: {
            errors(): MyError[] {
                return this.errs ? this.errs : (this.$store.state.parseState.errors as MyError[]);
            }
        },
        methods: {
            onRowClick(error: MyError) {
                if (error.line) {
                    this.$router.push({ path: 'editor', query: { line: error.line.toString() } });
                }
            }
        }
    })
</script>

<style scoped>

</style>
