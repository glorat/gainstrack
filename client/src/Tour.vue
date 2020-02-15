<template>
    <v-tour name="myTour" :steps="steps" :options="options" :callbacks="callbacks"></v-tour>
</template>

<script>
    export default {
        name: 'Tour',
        data() {
            const self = this;
            return {
                options: {
                    highlights: false // Make true when ready
                },
                steps: [
                    {
                        target: '#page-title',
                        content: 'If you would like a guided tour on how to use this site, press Next'
                    },
                    //  For placement, see https://popper.js.org/docs/v1/#Popper.placements
                    {
                        // target: '#add-record', // popper handles this wrong
                        target: '.myaside',
                        header: {
                            title: 'Add Record',
                        },
                        content: `Click "Add Record"`,
                        params: {
                            placement: 'right-start'
                        }
                    },
                    {
                        target: '#add-fund',
                        content: 'Click to fund our investment account',
                        beforeStep() {
                            self.goto('/add');
                        }
                    },
                    {
                        target: '.c-account-id',
                        content: 'Choose your investment account',
                        beforeStep() {
                            self.goto('/add/cmd?cmd=fund');
                        },
                        params: {
                            placement: 'right-start'
                        }
                    },
                    {
                        target: '.c-change',
                        content: 'Enter an amount of USD to fund the account (e.g 10000)',
                        params: {
                            placement: 'bottom'
                        }
                    },
                    {
                        target: '.c-add',
                        content: 'Press add to save this record',
                        params: {
                            placement: 'bottom'
                        }
                    },
                    {
                        // target: '#route-balance_sheet', // popper fails on this
                        target: '.myaside',
                        content: 'Navigate to the balance sheet to see the effect',
                        params: {
                            placement: 'right-start'
                        }
                    },
                    {
                        target: '#assets-table',
                        content: 'Here we can see money transferred from the bank account to the investment account',
                        params: {
                            placement: 'top'
                        },
                        beforeStep() {
                            self.goto('/balance_sheet');
                        },
                    },
                    {
                        // target: '#add-record', // popper handles this wrong
                        target: '.myaside',
                        header: {
                            title: 'Add Record',
                        },
                        content: `Click "Add Record" so we can begin to record a stock purchase`,
                        params: {
                            placement: 'right-start'
                        }
                    },
                    {
                        target: '#add-trade',
                        content: 'Click to record a trade',
                        beforeStep() {
                            self.goto('/add');
                        }
                    },
                    {
                        target: '.c-account-id',
                        content: 'Choose your investment account',
                        beforeStep() {
                            self.goto('/add/cmd?cmd=trade');
                        },
                        params: {
                            placement: 'right'
                        }
                    },
                    {
                        target: '.c-change',
                        content: 'Enter the shares you are purchasing, e.g. 5 GOOG shares',
                        params: {
                            placement: 'bottom'
                        }
                    },
                    {
                        target: '.c-price',
                        content: 'Enter the price you bought the shares for, e.g. 1500 USD',
                        params: {
                            placement: 'bottom'
                        }
                    },
                    {
                        target: '.c-add',
                        content: 'Press add to save this trade',
                        params: {
                            placement: 'bottom'
                        }
                    },
                    {
                        // target: '#route-balance_sheet', // popper fails on this
                        target: '.myaside',
                        content: 'Navigate to the balance sheet to see the effect',
                        params: {
                            placement: 'right-start'
                        }
                    },
                    {
                        // target: '#route-balance_sheet', // popper fails on this
                        target: '.login',
                        content: 'Thank you for completing the guided tour. Feel free to keep making any changes and experiment. If you want your changes to be saved, you will need to Sign/Up Login',
                        params: {
                            placement: 'right-start'
                        }
                    },
                ],
                callbacks: {
                    onPreviousStep(current) {
                        const nextStep = self.steps[current - 1];
                        if (nextStep && nextStep.beforeStep) {
                            nextStep.beforeStep()
                        }
                    },
                    onNextStep(current) {
                        const nextStep = self.steps[current + 1];
                        if (nextStep && nextStep.beforeStep) {
                            nextStep.beforeStep()
                        }
                    }
                }
            }
        },
        methods: {
          goto(target) {
              // tslint:disable-next-line
              this.$router.push(target).catch(err => {})
          },
        },
        computed: {
            authentication() {
                return this.$store.state.summary.authentication;
            },
        },
        mounted() {
            // The tour is for anonymous users only
            if (!this.authentication.username) {
                this.$tours.myTour.start()
            }
        },
    }
</script>

<style scoped>

</style>