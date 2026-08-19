import { CollectionReference, Query, QueryConstraint, query, where, orderBy } from 'firebase/firestore';

/**
 * Builds a Firestore query from the clause objects `searchObjToQuery` produces.
 *
 * Lives apart from schema.ts because it is the only part of the assetdb schema that
 * touches the Firebase client SDK. client/functions imports schema.ts on its cold-start
 * path but deploys without `firebase`, so keeping this here is what lets schema.ts stay
 * a pure module — see client/functions/test/packaging.spec.ts.
 */
export function applyQueries(col: CollectionReference, queries: any[]): Query {
  const constraints: QueryConstraint[] = [];
  queries.forEach(qry => {
    if (qry.where && qry.where.length === 3) {
      constraints.push(where(qry.where[0], qry.where[1], qry.where[2]));
    } else if (qry.orderBy) {
      constraints.push(orderBy(qry.orderBy[0], qry.orderBy[1]));
    }
  });
  return query(col, ...constraints);
}
