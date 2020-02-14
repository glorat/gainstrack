import {mapGetters} from "vuex";

export const CommandEditorMixin = {
    inheritAttrs: false,
    props: {cmd: Object},
    methods: {
        inputChanged() {
            //const str = this.toGainstrack;
            //this.$emit('gainstrack-changed', str);
        }
    },
    updated() {
        const str = this.toGainstrack;
        this.$emit('gainstrack-changed', str);
    },
    mounted() {
        const str = this.toGainstrack;
        this.$emit('gainstrack-changed', str);
    },
    watch: {
        toGainstrack() {
            const str = this.toGainstrack;
            this.$emit('gainstrack-changed', str);
        }
    },
    computed: {
        ...mapGetters([
            'tradeableAccounts',
            'findAccount',
            'mainAccounts',
            'mainAssetAccounts',
        ]),
    }
};