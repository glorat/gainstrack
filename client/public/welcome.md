## Welcome to gainstrack
### Why gainstrack?
Do you know your networth? Is your wealth spread across multiple accounts in multiple countries? Struggling to keep track? How close are you to financial independence?

Gainstrack is the app to help you get in personal control of your finances with a dashboard to see your wealth in one place

### Getting started
- Set up your accounts in the Editor or offline in a .gainstrack file
- Save your accounts locally in your computer
- Upload to the server to generate reports

### Release notes
#### v0.3.0
4 January
- FIX: Error reporting on uploaded files
- FIX: Date selector off-by one error on P&L Explain
- Experimental authentication support
#### v0.2.0
14 December
- Addition of bal command for EOD balance adjustment/assertions, plus numerous edge case fixes for bal/adj generally
- Improvements to base currency conversion in reports such as P&L Explain and IRR
- P&L explain automatically reports over a range of typical time periods - very cool

### Errata
#### Jan'20
- The login facility is for experimental purposes only, not for general use
#### Dec'19
- P&L Explain may pull in real historic quotes from external data sources but other reports do not.
- Income/Expenses/Liabilities are counterintuitively affected by future market prices, rather than retaining their original cost basis
#### Nov'19
- Liabilities are not supported in reports yet
