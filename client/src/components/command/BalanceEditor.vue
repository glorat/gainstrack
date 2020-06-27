<template>
    <div class="row items-start">
      <q-input @focus="$event.target.select()" type="number" v-model.number="value.number" v-on:input="onChanged()"></q-input>
      <asset-id v-model="value.ccy" v-on:input="onChanged()"></asset-id>
    </div>
</template>

<script lang="ts">
    import Vue from 'vue';
    import AssetId from '../AssetId.vue';
    import {Input} from 'element-ui';
    export default Vue.extend({
        name: 'BalanceEditor',
        components: {
            AssetId,
            'el-input': Input,
        },
        props: {value: Object},
        methods: {
            onChanged() {
                this.$emit('input', this.value);
            }
        }
    })
</script>

<style scoped>

</style>
