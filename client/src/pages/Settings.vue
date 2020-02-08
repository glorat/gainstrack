<template>
    <div>
        <div>
            <h4>Reporting currency</h4>
            TODO
        </div>
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
        components: {AssetsEditor, AssetId}
    }
</script>

<style scoped>

</style>