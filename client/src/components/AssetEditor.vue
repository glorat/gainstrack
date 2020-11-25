<template>
  <q-card>
    <q-card-section>
      <asset-id :value="assetId"></asset-id>
      <q-input v-for="opt in assetOptions" :key="opt" :label="opt" v-model="asset.options[opt]"></q-input>
<!--      <q-chip-->
<!--        v-for="opt in assetOptions" :key="opt" :label="opt"-->
<!--        clickable-->
<!--      ></q-chip>-->
      <q-card-section>
        <pre>{{ asGainstrack }}</pre>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn class="c-cancel" color="primary" type="button" v-on:click="cancel">Cancel</q-btn>
        <q-btn class="c-add" color="primary" @click="onSubmit" :disable="upserting" :loading="upserting">
          Submit
          <template v-slot:loading>
            <q-spinner />
          </template>
        </q-btn>
        <!--        <q-btn flat label="Cancel" v-close-popup/>-->
        <!--        <q-btn flat label="Submit" @click="onOKClick" />-->
      </q-card-actions>

    </q-card-section>
  </q-card>

</template>

<script lang="ts">
import AssetId from './AssetId.vue';
import Vue from 'vue';
import {AllState, AssetDTO} from '../lib/models';
import { keys, cloneDeep } from 'lodash';
import {toCommodityGainstrack} from 'src/lib/commandDefaulting';

export default Vue.extend({
  name: 'AssetEditor',
  components: {AssetId},
  props: {
    assetId: String
  },
  data() {
    return {
      asset: {asset: this.assetId, options: {}} as AssetDTO,
      upserting: false
    }
  },
  methods: {
    originalAssetFor(assetId: string) {
      return this.allState.assetState.find( x => x.asset === assetId);
    },
    async onSubmit() {
      try {
        this.upserting = true
        await this.$store.dispatch('upsertAsset', this.asset)
        this.$emit('ok', this.asset)
      }
      catch (error) {
        this.$notify.error('Failed to add/update asset')
        console.log(error)
      }
      finally {
        this.upserting = false;
      }

    },
    cancel () {
      this.$emit('cancel')
    },
  },
  computed: {
    allState(): AllState {
      return this.$store.state.allState;
    },
    originalAsset(): AssetDTO|undefined {
      return this.originalAssetFor(this.assetId);
    },
    assetOptions():string[] {
      return keys(this.asset?.options ?? []).filter(k => !!this.asset?.options[k]).sort();
    },
    asGainstrack(): string {
      return toCommodityGainstrack(this.asset)
    }

  },
  watch: {
    originalAsset(newVal) {
      this.asset = cloneDeep(newVal);
    }
  },
  mounted() {
    if (this.originalAsset) {
      this.asset = cloneDeep(this.originalAsset);
    }
  }
})
</script>

<style scoped>

</style>
