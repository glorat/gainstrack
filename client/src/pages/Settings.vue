<template>
    <div>
        <div>
            <h4>Asset configuration</h4>
            <assets-editor></assets-editor>
        </div>
    </div>
</template>

<script>
    import AssetId from '../components/AssetId';
    import AssetsEditor from '../components/AssetsEditor';
    export default {
        name: 'Settings',
        components: {AssetsEditor, AssetId},
        computed: {
        }
    }
</script>

<style scoped>

</style>