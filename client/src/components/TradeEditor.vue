<template>
    <div>
        <input type="text" v-model="cmd.date">
        <input type="text" v-model="cmd.accountId">
        <balance-editor v-model="cmd.security"></balance-editor>
        @<balance-editor v-model="cmd.price"></balance-editor>
        c<balance-editor v-model="cmd.commission"></balance-editor>
    </div>
</template>

<script>
    import BalanceEditor from "./BalanceEditor.vue";

    export default {
        name: "TradeEditor",
        components: {BalanceEditor},
        props: {cmd:Object},
        watch: {
            toGainstrack() {
                const str = this.toGainstrack;
                this.$emit('gainstrack-changed', str);
            }
        },
        mounted() {
            const str = this.toGainstrack;
            this.$emit('gainstrack-changed', str);
        },
        computed: {
            toGainstrack() {
                let baseStr = `${this.cmd.date} trade ${this.cmd.accountId} ${this.cmd.security.value} ${this.cmd.security.ccy} @${this.cmd.price.value} ${this.cmd.price.ccy} C${this.cmd.commission.value} ${this.cmd.commission.ccy}`;
                return baseStr
            }
        },
    }
</script>

<style scoped>

</style>
