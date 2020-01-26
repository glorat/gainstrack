<template>
    <div>
        TODO: Editor for {{ this.$route.query.cmd }}
        <command-editor :type="this.$route.query.cmd" v-on:gainstrack-changed="gainstrackChange($event)"></command-editor>
        <div>
            <pre>{{ commandStr }}</pre>
        </div>
    </div>
</template>

<script>
    import CommandEditor from '../components/CommandEditor';
    export default {
        name: 'AddCmd',
        components: {CommandEditor},
        data() {
            return {
                commandStr: '',
            }
        },
        methods: {
            gainstrackChange(ev) {
                this.commandStr = ev;
            },
        },
    }
</script>

<style scoped>

</style>