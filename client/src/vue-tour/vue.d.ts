import {Tour} from 'vue-tour';

declare module "vue/types/vue" {

    interface Vue {
        $tours: Record<string, Tour>;
    }
}
