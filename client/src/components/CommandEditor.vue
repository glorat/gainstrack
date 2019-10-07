<template>
    <div v-if="type === 'Transfer'">
        <transfer :cmd="cmd" v-on:gainstrack-changed="gainstrackChanged($event)"></transfer>
    </div>
    <div v-else-if="type === 'SecurityPurchase'">
        <trade-editor :cmd="cmd" v-on:gainstrack-changed="gainstrackChanged($event)"></trade-editor>
    </div>
    <div v-else-if="type === 'C'">
        C
    </div>
    <div v-else>
        Widget of type {{ type }} has payload {{cmd}}
    </div>
</template>

<script>
    import Transfer from "./Transfer";
    import TradeEditor from "./TradeEditor";
    export default {
        name: "CommandEditor",
        components: {TradeEditor, Transfer},
        methods: {
          gainstrackChanged(str) {
              this.$emit('gainstrack-changed', str);
          }
        },
        props: {cmd:Object, type:String},
    }
</script>

<style scoped>

</style>
