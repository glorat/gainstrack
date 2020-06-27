<template>
  <command-date-editor @input="onDateChange" :value="dateOverride"></command-date-editor>
</template>

<script>

    export default {
        name: 'FilterForm',
        computed: {
            latestDate() {
                return this.$store.state.summary.latestDate;

            },
            dateOverride() {
                return this.$store.state.summary.dateOverride;
            }
        },
        methods: {
            onDateChange(e) {
                this.$store.dispatch('dateOverride', e);
            },
        }
    }
</script>

<style scoped>

</style>
