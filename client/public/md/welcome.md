#### Welcome to gainstrack
##### Why gainstrack?
Do you know your networth? Is your wealth spread across multiple accounts in multiple countries? Struggling to keep track? How close are you to financial independence?

Gainstrack is the app to help you get in personal control of your finances with a dashboard to see your wealth in one place

##### Getting started
For anonymous users
- Try the guided tour!
- Export/Upload the gainstrack content to your local computer (see Editor)

For online use
- Login/Sign-up
- Use the editors to supply your information
- Export locally if desired

##### Errata

###### Feb'20
- While the UI editor can be used for submitting new entries, amendments or deletions can only be done via the text editor
- Now that Google Analytics is added, we really need a privacy policy

###### Dec'19
- Income/Expenses/Liabilities are counterintuitively affected by future market prices, rather than retaining their original cost basis
###### Nov'19
- Liabilities are not supported in reports yet


### Release notes
###### v1.3.0
Sep
- Refactored auth0 login integration for better stability

###### v1.2.0
16 August
- Whole architecture has been revamped. Now following a serverless architecture inspired off the https://www.covibes.org project
- No more cookies for state management of accounts
- Only Auth0 for authentication, now supports persistent login
- Greatly reduced required bandwidth for using app
- Various experimental changes at reducing network traffic - more logic handled in the browser

###### v1.1.0
1 July
- Various experimental changes in the UI
- Migrating away from Element UI to Quasar for widgets

###### v1.0.0
21 March
- Mobile usable UI based on Quasar
- Assets report

###### v0.10.0
14 March
- Smart multi-currency conversion - if it can be converted, the best conversion will be applied
- Sunburst Asset Allocation report
- Spend command

###### v0.9.1
8 March
- More efficient alternative for data entry
- Guided tour updated for new entry method

###### v0.9.0
7 March
- Live quotes more reliably being pulled in
- "Proxy" feature for live quotes
- Minor fixes for account graph and PnlExplain

###### v0.8.0
29 February
- Minor fixes for reporting added commands and errors

###### v0.7.0
22 February
- A fairly comprehensive guided tour for new users
- Google analytics added to website

###### v0.6.0
15 February
- A completed set of UI editors for adding all commands
- Improved P&L explain for new activity and income
- A basic guided tour

###### v0.5.0
8 February
- Rudimentary UI for updating your data without the text entry

###### v0.4.0
1 February
- Much improved P&L Explain reporting
- Switched graphs to plotly.js library
- Login support to save your data server side
###### v0.3.0
4 January
- FIX: Error reporting on uploaded files
- FIX: Date selector off-by one error on P&L Explain
- Experimental authentication support
###### v0.2.0
14 December
- Addition of bal command for EOD balance adjustment/assertions, plus numerous edge case fixes for bal/adj generally
- Improvements to base currency conversion in reports such as P&L Explain and IRR
- P&L explain automatically reports over a range of typical time periods - very cool

