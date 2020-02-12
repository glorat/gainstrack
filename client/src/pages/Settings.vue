<template>
    <div>
        <div>
            <h4>Asset configuration</h4>
            <assets-editor></assets-editor>
        </div>
    </div>
</template>

<script lang="ts">
    import AssetId from '@/components/AssetId.vue';
    import AssetsEditor from '@/components/AssetsEditor.vue';

    export default {
        name: 'Settings',
        components: {AssetsEditor, AssetId},
        computed: {
        }
    }
</script>

<style scoped>

</style>