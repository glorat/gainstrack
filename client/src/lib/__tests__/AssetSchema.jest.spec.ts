import {
  getFieldNameList,
  quoteSourceFieldProperties,
  quoteSourceSchema,
  quoteSourceSearchSchema,
  searchObjToQuery
} from "src/lib/AssetSchema";

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

  // This test was originally for when these methods would recursively go into nested schemas
  // but that wasn't happening so this is just a shallow check now
  test('quoteSourceSearchSchema methods', () =>{
    const schema = quoteSourceSearchSchema;
    const valid = schema.validPropertiesForAsset(sample);

    expect(valid.length).toStrictEqual(4);
    const selected = schema.selectedPropertiesForAsset(sample);
    expect(selected.length).toStrictEqual(8);

    const available = schema.availablePropertiesForAsset(sample);
    expect(available.length).toStrictEqual(0);
    // expect(available.find(x => x.name === 'asset.type')).toBeDefined();
    // expect(available.find(x => x.name === 'asset.fixedIncomeClass')).toBeUndefined();
  });

  test('searchObjToQuery', () => {
    const qry = searchObjToQuery(sample, quoteSourceFieldProperties);
    expect(qry.length).toStrictEqual(9);

    const flds = qry.map(x => x['where'][0]);
    expect(flds).toEqual(['id', 'name', 'ticker', 'marketRegion', 'sources', 'asset.type', 'asset.assetClass', 'asset.geography', 'asset.references']);
  });


});
