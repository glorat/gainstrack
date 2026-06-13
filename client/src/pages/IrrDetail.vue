<template>
    <my-page padding>
        <h6>Investment cashflows for <router-link :to="{name:'account', params:{accountId:accountId}}">{{accountId}}</router-link></h6>
        <table class="queryresults sortable">
            <thead>
            <tr>
                <th data-sort="string">account</th>
                <th data-sort="num">date</th>
                <th data-sort="num">value</th>
                <th data-sort="num">cvalue</th>
                <th data-sort="string">source</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(date,index) in detail.dates">
                <td>
                    {{ accountId}}
                </td>
                <td class="string">{{ date }}</td>
                <td class="num" v-bind:data-sort-value="detail.values[index]">{{ detail.values[index]}} {{ detail.units[index]}}</td>
                <td class="num" v-bind:data-sort-value="detail.cvalues[index]">{{ detail.cvalues[index]}}</td>

                <td class="string">{{ detail.description[index] }}</td>
            </tr>
            </tbody>
        </table>
    </my-page>
</template>

<script setup lang="ts">
import { useAppStore } from 'src/stores'
import { apiIrrDetail } from 'src/lib/apiFacade'
import { ref, onMounted } from 'vue'
import { qnotify } from 'src/boot/notify'

type IrrDetailData = Awaited<ReturnType<typeof apiIrrDetail>>

const props = defineProps<{ accountId: string }>()
const store = useAppStore()
const detail = ref<IrrDetailData>({ name: '', units: [], dates: [], values: [], cvalues: [], description: [] } as unknown as IrrDetailData)

async function refresh() {
  try {
    detail.value = await apiIrrDetail(store, props)
  } catch (error) {
    console.log(error)
    qnotify.error(String(error))
  }
}

onMounted(() => { void refresh() })
</script>

<style scoped>

</style>
