#!/bin/bash
export APIKEY=`cat db/apikey.txt`
export SYMBOL=VWRD.LON

wget -O db/$SYMBOL.json "https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=$SYMBOL&apikey=$APIKEY"
wget -O db/$SYMBOL.csv "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=$SYMBOL&outputsize=full&datatype=csv&apikey=$APIKEY"

export FXSYMBOL=GBP
wget -O db/$FXSYMBOL.csv "https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=$FXSYMBOL&to_symbol=USD&outputsize=full&datatype=csv&apikey=$APIKEY"


