import {AssetDTO, AssetOptions} from './models';
import {includes} from 'lodash';
import {
  assetCategories,
  assetClass,
  equityCapSizes,
  fixedIncomeTypes,
  fundManagement,
  geography,
  incomeTreatment,
  investmentAssetTypes,
  issuerBrand,
  marketRegions,
  quoteSourceTypes
} from './enums';

import {FieldProperty, makeSearchSchema, propDefined, Schema} from './schema';

const categoryProperty = {name: 'category', label: 'Category', description: 'Category or type of asset', fieldType: 'enum', fieldMeta: assetCategories};

export const userAssetProperties:FieldProperty[] = [
  categoryProperty,
  {name: 'ticker', label: 'Ticker', description: 'Ticker symbol for listed quotes', fieldType: 'ticker',
    valid: (props) => props['category'] === 'investment' && !propDefined(props,'benchmark')
  },
  {name: 'proxy', label: 'Benchmark', description: 'Ticker symbol of benchmark that the asset tracks', fieldType: 'ticker',
  valid: (props) => !propDefined(props,'ticker')},
];

const externalReference: FieldProperty = {
  name: 'reference', label: 'Reference', description: 'URL to a website', fieldType: 'string'
};

export const investmentAssetProperties: FieldProperty[] = [
  {name: 'type', label: 'Type', description: 'Stock/ETF/Fund', fieldType: 'enum', fieldMeta: investmentAssetTypes, searchLevel: 1},
  {name: 'assetClass', label: 'Asset Class', description: 'Asset Class', fieldType: 'enum', fieldMeta: assetClass, searchLevel: 1,
    valid: props => includes(['ETF','Fund','Index'], props['type'])},
  {name: 'fixedIncomeSubclass', label: 'Fixed Income Subclass', description: 'Fixed Income Subclass', fieldType: 'multiEnum', fieldMeta: fixedIncomeTypes,
    valid: (props) => props['assetClass'] == 'Fixed Income'
  },
  {name: 'geography', label: 'Geography', description: 'Region the ETF/Fund covers', fieldType: 'enum', fieldMeta: geography, searchLevel: 1,
    valid: (props) => includes(['ETF','Fund','Index'], props['type'])
  },
  {name: 'equityCapSize', label: 'Market Cap Size', description: 'Equity Market Cap Size (Small/Mid/Large)', fieldType: 'enum', fieldMeta: equityCapSizes,
    valid: (props) => props['assetClass'] == 'Equity' && includes(['ETF', 'Fund', 'Index'], props['type'])
  },
  {name: 'issuerBrand', label: 'Issuer', description: 'Issuer Brand', fieldType: 'enum', fieldMeta: issuerBrand,
    valid: props => includes(['ETF','Fund'], props['type'])},
  {name: 'fundManagement', label: 'Fund Management', description: 'Active vs Passive managed funds', fieldType: 'enum', fieldMeta: fundManagement,
  valid: props => includes(['ETF','Fund'], props['type'])},
  {name: 'incomeTreatment', label: 'Income Treatment', description: 'Accumulation vs Distribution', fieldType: 'enum', fieldMeta: incomeTreatment,
    searchLevel: 2,
    valid: props => includes(['ETF','Fund'], props['type'])},
  {name: 'domicile', label: 'Domicile', description: 'Domicile of asset', fieldType: 'string',
    searchLevel: 1,
    valid: (props) => includes(['ETF','Fund','Stock'], props['type'])
  },
  {name: 'ter', label: 'TER/OCF', description: 'Total Expense Ratio or Ongoing Charge. Annual %', fieldType: 'percentage',
  valid: props => includes(['ETF','Fund'], props['type'])},
  {name: 'hedgeCurrency', label: 'Hedged Currency', description: 'Currency to which fund is hedged to', fieldType: 'string',
    searchLevel: 2,
    valid: props => includes(['ETF','Fund'], props['type'])
  },
  {name: 'isin', label: 'ISIN', description: 'ISIN', fieldType: 'string',
    valid: props => includes(['ETF', 'Fund', 'Stock'], props['type'])
  },
  {name: 'references', label: 'External Reference', description: 'External reference websites', fieldType: 'array', fieldMeta: externalReference,
    searchValid: () => false
  },
  ];



const nameProperty ={name: 'name', label: 'Short Name', description: 'Short name for you to identify the asset', fieldType: 'asset'};
const unknownProperty = (name: string) => {return {name, label: `UNKNOWN ${name}`, description: 'Internal error', fieldType: 'unknown'}};

const newAssetProperties: FieldProperty[] = [
  nameProperty,
  {name: 'units', label: 'Units or Quantity', description: 'Number of this asset you own', fieldType: 'number'},
  {name: 'date', label: 'Purchase Date', description: 'When asset was procured', fieldType: 'date',
    valid: (props) => props['category'] !== 'cash'},
  {name: 'price', label: 'Purchase Price', description: 'Price asset was purchased', fieldType: 'balance',
    valid: (props) => props['category'] !== 'cash'},
];



const mandatoryProperties: FieldProperty[] = [nameProperty, categoryProperty];
const optionalProperties = [...userAssetProperties, ...newAssetProperties].filter(p => !includes(mandatoryProperties, p));
const allProperties = [...mandatoryProperties, ...optionalProperties];



const quoteSourceSourceFieldProperties: FieldProperty[] = [
  {name: 'sourceType', fieldType: 'enum', label: 'Source', description: 'Source Type', fieldMeta: quoteSourceTypes},
  {name: 'ref', fieldType: 'string', label: 'Symbol', description: 'Source specific symbol or ticker'},
  {name: 'meta', fieldType: 'string', label: 'Meta', description: 'Additional sourcing specific information required'},
];

export const quoteSourceFieldProperties: FieldProperty[] = [
  {name: 'id', fieldType: 'string', label: 'Id', description: 'System Id', searchValid: () => false},
  {name: 'name', fieldType: 'string', label: 'Name', description: 'Descriptive name of asset', searchValid: () => false},
  {name: 'ticker', fieldType: 'string', label: 'Ticker', description: 'Ticker symbol'},
  {name: 'marketRegion', fieldType: 'enum', fieldMeta: marketRegions, label: 'Market Region', description: 'Market Region, or IND for indices, or Global'},
  {name: 'exchange', fieldType: 'string', label: 'Exchange', description: 'Exchange code where quotes for this asset are sourced'},
  {name: 'ccy', fieldType: 'string', label: 'Currency', description: 'Currency in which this quote is traded'},
  {name: 'sources', fieldType: 'unknown', label: 'Quote Sources', description: 'Quote sourcing details', fieldMeta: quoteSourceSourceFieldProperties},
  {name: 'asset', fieldType: 'object', label: 'Asset', description: 'Asset details', fieldMeta: investmentAssetProperties},
];


export const userAssetSchema: Schema = new Schema({
  properties: userAssetProperties,
  validPropertiesForAsset(props: Record<string, any>) {
    if (!props['name']) {
      return [nameProperty]
    } else if (!props['category']) {
      return [categoryProperty]
    }
    const inScope = this.properties;
    return inScope.filter(p => !p.valid || p.valid(props))
  }
});

export const investmentAssetSchema: Schema = new Schema({
  properties: investmentAssetProperties,
  validPropertiesForAsset(fields: Record<string, any>): FieldProperty[] {
    return this.properties.filter(p => !p.valid || p.valid(fields))
  }
});

export const quoteSourceSchema: Schema = new Schema({
  properties: quoteSourceFieldProperties,
  validPropertiesForAsset(fields: Record<string, any>): FieldProperty[] {
    return this.properties.filter(p => !p.valid || p.valid(fields))
  }
});


export const quoteSourceSearchSchema: Schema = makeSearchSchema(quoteSourceFieldProperties);

export const investmentAssetSearchSchema: Schema = makeSearchSchema(investmentAssetProperties);


export function schemaFor(name: string): FieldProperty {
  const ret = allProperties.find(x => x.name === name);
  return ret ?? unknownProperty(name);
}

const defaultCommodityDate = '1900-01-01';

export function createAssetFromProps(props: Record<string, any>): AssetDTO{
  const options: AssetOptions = {tags: []};
  userAssetProperties.forEach(p => {
    if (props[p.name]) {
      options[p.name] = props[p.name]
    }
  });

  const asset = {
    commandType: 'commodity',
    date: defaultCommodityDate,
    asset: props['name'] ?? 'undefined',
    options
  };
  return asset;
}
