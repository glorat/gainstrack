<template>
    <button type="button" :title="`Toggle ${name} entries`" :class="{inactive : offState[name]}" @click="onClick">{{ name }}</button>
</template>

<script>
    export default {
        name: 'ButtonToggle',
        props: {
            name: String,
            offState: Object
        },
        methods: {
          onClick() {
              this.$set(this.offState, this.name, !this.offState[this.name]);
              //this.offState[this.name] = !this.offState[this.name];
          }
        }
    }
</script>

<style scoped>

</style>
