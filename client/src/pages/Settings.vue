<template>
    <div>
        <div>
            <h4>Asset configuration</h4>
            <assets-editor></assets-editor>
        </div>
    </div>
</template>

<script lang="ts">
    import AssetsEditor from '@/components/AssetsEditor.vue';

    export default {
        name: 'Settings',
        components: {AssetsEditor},
        computed: {
        }
    }
</script>

<style scoped>

</style>
