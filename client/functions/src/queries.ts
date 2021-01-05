import {Response} from "express";
import {Request} from "firebase-functions/lib/providers/https";

export function applyQueries(col: FirebaseFirestore.CollectionReference, queries: any[]): FirebaseFirestore.Query|FirebaseFirestore.CollectionReference {
  let ret:FirebaseFirestore.Query|FirebaseFirestore.CollectionReference = col;

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
  })
  return ret;
}
function queryArgsToObj(args: unknown) {
  try {
    if (args && 'string'===typeof(args)) {
      const params = JSON.parse(args);
      return params;
    } else {
      return {};
    }
  } catch (e) {
    console.error(e);
    return {};
  }
}

async function doQuoteSourceQuery(db: FirebaseFirestore.Firestore, query: any) {
  const col = db.collection('quoteSources');

  const filtered = applyQueries(col, query);
  const x = await filtered.get();
  const rows = x.docs.map((doc: any) => {
    const data = doc.data();
    data.id = doc.id;
    return data;
  });
  return rows;
}


export const quoteSourcesHandler:(db: FirebaseFirestore.Firestore) => (req: Request, resp: Response) => void | Promise<void> = (db) => async(req, res) => {
  const qry = req.body.query ?? [{"where":["asset.type","==","ETF"]}];
  const rows = await doQuoteSourceQuery(db, qry);
  res.json({rows});
};


export const quoteSourcesQueryHandler:(db: FirebaseFirestore.Firestore) => (req: Request, resp: Response) => void | Promise<void> = (db) => async(req, res) => {
  const query = req.query;
  const args = queryArgsToObj(query.args);
  const rows = await doQuoteSourceQuery(db, args.query);
  res.json({rows});
};
