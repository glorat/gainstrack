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
                        navTarget: {path: '/add'},
                    },
                    {
                        target: '.c-account-id',
                        content: 'Choose your investment account',
                        navTarget: {path: '/add/cmd', query: {cmd: 'fund'}},
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
                        navTarget: {path: '/balance_sheet'},
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
                        navTarget: {path: '/add'},
                    },
                    {
                        target: '.c-account-id',
                        content: 'Choose your investment account',
                        navTarget: {path: '/add/cmd', query: {cmd: 'trade'}},
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
                        navTarget: {path: '/balance_sheet'},
                        params: {
                            placement: 'right-start'
                        }
                    },
                ],
                callbacks: {
                    onPreviousStep(current) {
                        const nextStep = self.steps[current - 1];
                        if (nextStep && nextStep.navTarget) {
                            self.goto(nextStep.navTarget);
                        }
                    },
                    onNextStep(current) {
                        const nextStep = self.steps[current + 1];
                        if (nextStep && nextStep.navTarget) {
                            self.goto(nextStep.navTarget);
                        }
                    }
                }
            }
        },
        methods: {
            goto(target) {
                // tslint:disable-next-line
                this.$router.push(target).catch(err => {
                })
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
                this.$router.afterEach((to, from) => {
                    const nextStepIdx = this.$tours.myTour.currentStep + 1;
                    const nextStep = this.steps[nextStepIdx];
                    if (nextStep && nextStep.navTarget && nextStep.navTarget.path === to.path) {
                        // TODO: Also compare to.query with nextStep.navTarget.query
                        // TODO: Undo this hack where we just assume the new route will render in time
                        setTimeout(() => this.$tours.myTour.nextStep(), 500);
                    }
                    // console.log(`routed to ${to.path} ${JSON.stringify(to.query)}`)
                });
                this.$tours.myTour.start()
            }
        },
    }
</script>

<style scoped>

</style>