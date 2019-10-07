<template>
    <div>
        <input type="text" name="date" v-model="cmd.date" v-on:input="inputChanged()">
        Transfer:
        <input type="text" name="source" v-model="cmd.source" v-on:input="inputChanged()">
        amount
        <balance-editor v-model="cmd.sourceValue" v-on:input="inputChanged()"></balance-editor>
        to
        <input type="text" name="dest" v-model="cmd.dest" v-on:input="inputChanged()">
        value
        <balance-editor v-model="cmd.targetValue" v-on:input="inputChanged()"></balance-editor>
    </div>
</template>

<script>
    import BalanceEditor from "./BalanceEditor.vue";

    export default {
        name: "Transfer",
        props: {cmd:Object},
        components: {BalanceEditor},
        methods: {
          inputChanged() {
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
                let baseStr = `${this.cmd.date} tfr ${this.cmd.source} ${this.cmd.dest} ${this.cmd.sourceValue.value} ${this.cmd.sourceValue.ccy}`;
                if (this.cmd.sourceValue.value !== this.cmd.targetValue.value
                || this.cmd.sourceValue.ccy !== this.cmd.targetValue.ccy) {
                    baseStr += ` ${this.cmd.targetValue.value} ${this.cmd.targetValue.ccy}`;
                }
                return baseStr
            }
        }
    }
</script>

<style scoped>

</style>
