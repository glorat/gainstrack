<template>
    <button type="button" :title="`Toggle ${name} entries`" :class="{inactive : offState[name]}" @click="onClick">{{ name }}</button>
</template>

<script lang="ts">
    import Vue from 'vue'

    export default Vue.extend({
        name: 'ButtonToggle',
        props: {
            name: String,
            offState: Object
        },
        methods: {
          onClick() {
              this.$set(this.offState, this.name, !this.offState[this.name]);
              // this.offState[this.name] = !this.offState[this.name];
          }
        }
    })
</script>

<style scoped>

</style>
