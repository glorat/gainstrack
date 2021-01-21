import {getFieldNameList, quoteSourceSchema, quoteSourceSearchSchema} from "src/lib/AssetSchema";

describe ('Asset Schema', ()=>{
  const sample = JSON.parse("{\"marketRegion\":\"IND\",\"asset\":{\"assetClass\":\"Equity\",\"geography\":\"Global\",\"type\":\"Index\",\"references\":[\"https://www.investing.com/indices/ftse-all-world\",\"https://markets.ft.com/data/indices/tearsheet/summary?s=aw01:fsi\",\"https://www.trackinsight.com/en/index/1218\"]},\"lastUpdate\":{\"uid\":\"fec320db-f125-35f3-a0d2-e66ca7e4ce95\",\"history\":\"i0VWosNvEu9h8bp0J4vK\",\"timestamp\":1610806338995,\"revision\":2},\"ccy\":\"\",\"name\":\"FTSE All World\",\"ticker\":\"FTAWORLDSR\",\"sources\":[],\"id\":\"FTAWORLDSR.IND\",\"exchange\":\"\",\"providers\":{}}\n");



  test('getFieldNameList', () => {
    const schema = quoteSourceSchema
    const flds = getFieldNameList(schema.properties);
    const geo = flds.find(x => x.value === 'asset.geography');
    expect(geo).toBeDefined();
    if (geo) {
      expect(geo.label).toEqual('Geography')
    }
  });

  test('search', () =>{
    const schema = quoteSourceSearchSchema;
    // console.log(schema.properties)
    // const valid = schema.validPropertiesForAsset(sample)
    // console.log(valid)
    const selected = schema.selectedPropertiesForAsset(sample);
    expect(selected.length).toStrictEqual(12);

    const available = schema.availablePropertiesForAsset(sample);
    expect(available.find(x => x.name === 'asset.type')).toBeDefined();
    expect(available.find(x => x.name === 'asset.fixedIncomeClass')).toBeUndefined();
  })


});
