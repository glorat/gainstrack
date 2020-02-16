<template>
    <v-tour name="myTour" :steps="steps" :options="options" :callbacks="callbacks"></v-tour>
</template>

<script>
    import EventBus from '@/event-bus';

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
                    {
                        target: '#page-title',
                        content: 'Gainstrack can become your personal accounting, a place to record all your activities that contribute to your networth and get insight over your networth and wealth. Suppose you have an investment account that you have funded with some cash and bought some shares. How can this be recorded? This guide will show you how as an example'
                    },
                    //  For placement, see https://popper.js.org/docs/v1/#Popper.placements
                    {
                        // target: '#add-record', // popper handles this wrong
                        target: '.myaside',
                        header: {
                            title: 'Begin adding your records',
                        },
                        content: `Click "Add Record" on the left menu bar`,
                        params: {
                            placement: 'right-start'
                        }
                    },
                    {
                        target: '#add-fund',
                        content: 'Here you can choose what type of event to record. Click "Fund" to fund our investment account',
                        navTarget: {path: '/add'},
                    },
                    {
                        target: '.c-account-id',
                        content: 'Choose your investment account (called Assets:Investment)',
                        navTarget: {path: '/add/cmd', query: {cmd: 'fund'}},
                        cmdTest(c) {
                            return c && c.accountId && c.accountId.startsWith('Assets:Investment');
                        },
                        params: {
                            placement: 'right-start'
                        }
                    },
                    {
                        target: '.c-change',
                        content: 'Enter an amount of USD to fund the account (e.g 10000)',
                        cmdTest(c) {
                            return c && c.change && c.change.number > 9999 && c.change.ccy;
                        },
                        params: {
                            placement: 'bottom'
                        }
                    },
                    {
                        target: '.c-add',
                        content: 'Press add to save this record',
                        params: {
                            placement: 'bottom'
                        },
                        eventTest(e, c) {
                            return e === 'command-added';
                        },
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
                        content: 'Click "Trade" to record a trade',
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
                        },
                        cmdTest(c) {
                            return c && c.change && c.change.number > 0 && c.change.ccy;
                        },
                    },
                    {
                        target: '.c-price',
                        content: 'Enter the price you bought the shares for, e.g. 1500 USD',
                        params: {
                            placement: 'bottom'
                        },
                        cmdTest(c) {
                            return c && c.price && c.price.number > 200 && c.price.ccy;
                        },
                    },
                    {
                        target: '.c-add',
                        content: 'Press "Add" to save this trade record',
                        params: {
                            placement: 'bottom'
                        },
                        eventTest(e, c) {
                            return e === 'command-added';
                        },
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
                const gogo = () => this.$router.push(target).catch(err => {
                });
                // Async this to avoid re-entrancy bug on router handler
                setTimeout(gogo, 100);
            },
        },
        computed: {
            authentication() {
                return this.$store.state.summary.authentication;
            },
        },
        mounted() {
            // TODO: Undo this hack where we just assume the new route will render in time
            const eventTriggerDelay = 500;

            // The tour is for anonymous users only
            if (!this.authentication.username) {
                this.$router.afterEach((to, from) => {
                    const nextStepIdx = this.$tours.myTour.currentStep + 1;
                    const nextStep = this.steps[nextStepIdx];
                    if (nextStep && nextStep.navTarget && nextStep.navTarget.path === to.path) {
                        // TODO: Also compare to.query with nextStep.navTarget.query
                        // TODO: Undo this hack where we just assume the new route will render in time
                        setTimeout(() => this.$tours.myTour.nextStep(), eventTriggerDelay);
                    }
                    // console.log(`routed to ${to.path} ${JSON.stringify(to.query)}`)
                });

                EventBus.$on('command-changed', c => {
                    const currentStep = this.steps[this.$tours.myTour.currentStep];
                    if (currentStep && currentStep.cmdTest && currentStep.cmdTest(c)) {
                        setTimeout(() => this.$tours.myTour.nextStep(), eventTriggerDelay);
                    }
                });
                EventBus.$on('command-added', c => {
                    const currentStep = this.steps[this.$tours.myTour.currentStep];
                    if (currentStep && currentStep.eventTest && currentStep.eventTest('command-added', c)) {
                        setTimeout(() => this.$tours.myTour.nextStep(), eventTriggerDelay);
                    }
                });

                this.$tours.myTour.start()
            }
        },
    }
</script>

<style scoped>

</style>