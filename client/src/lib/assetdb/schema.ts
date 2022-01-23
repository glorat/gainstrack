import {find, includes, keys, get} from 'lodash';
import {EnumEntry} from './enums';
import firebase from 'firebase/compat/app';
import CollectionReference = firebase.firestore.CollectionReference;
import Query = firebase.firestore.Query;

export interface FieldProperty {
  name: string
  label: string
  description: string
  fieldType: string // enum
  fieldMeta?: EnumEntry[] | unknown
  valid?: (props: Record<string, any>) => boolean
  searchValid?: (props: Record<string, any>) => boolean
  searchLevel?: number
}

export const unknownFieldProperty: FieldProperty = {
  name: '???',
  label: '',
  fieldType: 'string',
  description: 'unknown field property'
};

export interface SchemaConfig {
  properties: FieldProperty[]

  validPropertiesForAsset(fields: Record<string, any>): FieldProperty[]
}

export class Schema {
  constructor(readonly schemaConfig: SchemaConfig) {
  }

  get properties() {
    return this.schemaConfig.properties;
  }

  validPropertiesForAsset(props: Record<string, any>) {
    return this.schemaConfig.validPropertiesForAsset(props);
    // return this.schemaConfig.properties.filter(p => !p.valid || p.valid(props))
  }


  selectedPropertiesForAsset(props: Record<string, any>): FieldProperty[] {
    return this.properties.filter(p => propDefined(props, p.name));
  }

  /** valid and not yet in props */
  availablePropertiesForAsset(props: Record<string, any>): FieldProperty[] {
    const current = keys(props);
    const valid = this.validPropertiesForAsset(props);
    return valid.filter(v => !includes(current, v.name));
  }

}

export function propDefined(props: Record<string, any>, name: string): boolean {
  // Avoid Object prototype pollution as a defensive measure
  return Object.prototype.hasOwnProperty.call(props ?? {}, name);
}

export function makeSearchSchema(fieldProps: FieldProperty[]) {
  return new Schema({
    properties: fieldProps,
    validPropertiesForAsset(fields: Record<string, any>): FieldProperty[] {
      const def = (p: FieldProperty) => () => !includes(['array', 'object', 'unknown'], p.fieldType);
      const ret = this.properties.filter(p => {
        const fn = p.searchValid ?? p.valid ?? def(p);
        return fn(fields)
      });
      return ret;
    }
  });
}

export function findProperty(path: string, rootProps: FieldProperty[]): FieldProperty {
  if (!path.split) {
    debugger;
  }

  const bits = path.split('.');
  let prop: FieldProperty | undefined = undefined
  let props = rootProps;

  while (bits.length > 0) {
    const top = bits.shift();
    prop = find(props, p => p.name === top)
    if (prop === undefined) {
      return unknownFieldProperty;
    } else if (prop.fieldType === 'object') {
      props = prop.fieldMeta as FieldProperty[];
    } else if (bits.length > 0) {
      debugger;
      return unknownFieldProperty; // Sub path but not object
      // TODO: Add array clause?
    }
  }

  return prop ?? unknownFieldProperty;
}

export function searchObjToQuery(obj: any, fieldProps: FieldProperty[], fldFilter: (fld: FieldProperty) => boolean = () => true, prefix = '') {
  const ret: any[] = [];

  const searchableSelected = (fld: FieldProperty): boolean => fld.fieldType !== 'object'; // arrays etc?

  const schema = makeSearchSchema(fieldProps);

  schema.selectedPropertiesForAsset(obj).filter(searchableSelected).filter(fldFilter).forEach(fld => {
    if (obj[fld.name] !== '' && obj[fld.name] !== undefined) {
      ret.push({where: [`${prefix}${fld.name}`, '==', obj[fld.name]]})
    }
  });

  const nestedSchema = (fld: FieldProperty): boolean => fld.fieldType === 'object';
  schema.selectedPropertiesForAsset(obj).filter(nestedSchema).forEach(fld => {
    if (obj[fld.name] !== undefined) {
      const nestedProps = fld.fieldMeta as FieldProperty[];
      const more = searchObjToQuery(obj[fld.name], nestedProps, fldFilter, `${prefix}${fld.name}.`);
      ret.push(...more)
    }
  });
  return ret;
}

// but somewhat necessarily since different types are in use in web client sdk vs admin sdk
export function applyQueries(col: CollectionReference, queries: any[]): Query | CollectionReference {
  let ret: Query | CollectionReference = col;

  queries.forEach(qry => {
    if (qry.where) {
      const where = qry.where;
      if (where.length === 3) {
        ret = ret.where(where[0], where[1], where[2])
      }
    } else if (qry.orderBy) {
      const orderBy = qry.orderBy;
      ret = ret.orderBy(orderBy[0], orderBy[1])
    }
  });
  return ret;
}

export function getFieldNameList(props: FieldProperty[], prefix = ''): EnumEntry[] {
  const ret: EnumEntry[] = [];
  props.forEach(prop => {
    if (prop.fieldType==='array') {
      // Skip for now
    } else if (prop.fieldType==='multiEnum') {
      // Also skip for now
    } else if (prop.fieldType==='object') {
      const subs = getFieldNameList(prop.fieldMeta as FieldProperty[], `${prefix}${prop.name}.`);
      ret.push(...subs);
    } else {
      ret.push({value: `${prefix}${prop.name}`, label: prop.label, description: prop.description});
    }
  });

  return ret;
}// Returns a object suitable for use in a QTable column
const unknownColumn = (path: string) => ({label: path, name: path, field: () => 'N/A'});

function pathToFieldProperty(props: FieldProperty[], paths: string[]): FieldProperty | undefined {
  const path = paths.shift();
  const prop = find(props, x => x.name===path);
  if (prop===undefined) {
    return undefined;
  } else if (paths.length > 0 && prop.fieldType==='object') {
    return pathToFieldProperty(prop.fieldMeta as FieldProperty[], paths);
  } else {
    return prop;
  }
}

export function pathToTableColumn(props: FieldProperty[], path: string) {
  const prop = pathToFieldProperty(props, path.split('.'));
  if (prop) {
    const align = includes(['number', 'percentage'], prop.fieldType) ? 'right':'left';
    return {
      name: path,
      label: prop.label,
      field: (row: undefined) => get(row, path),
      align, // a sensible default based on type
      fieldType: prop.fieldType // For potential convienince
    };
  } else {
    return unknownColumn(path);
  }
}
