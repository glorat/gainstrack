import * as admin from 'firebase-admin';
import {onRequest, onCall, HttpsError} from 'firebase-functions/https';
import {onDocumentCreated} from 'firebase-functions/firestore';
import {quoteSourcesHandler, quoteSourcesTableHandler} from './queries';
import cors from 'cors';
import express from 'express';
import {quoteSourceHistoryCreateHandler} from './writes';

admin.initializeApp();

const whitelist = ['https://www.bogleheads.org', 'https://poc.gainstrack.com'];
const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    if (origin && whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

const corsHandler = cors(corsOptions);

const allQs = async (req: express.Request, res: express.Response) => {
  const x = await admin.firestore().collection('quoteSources').get();
  const ret = x.docs.map((doc: any) => {
    const data = doc.data();
    data.id = doc.id;
    return data;
  });
  res.json(ret);
};

export const getAllQuoteSources = onRequest(allQs);
export const fastGetAllQuoteSources = onRequest({region: 'asia-northeast1'}, allQs);

const qsHandler = (req: express.Request, res: express.Response) =>
  corsHandler(req, res, () => quoteSourcesHandler(admin.firestore())(req, res));
export const quoteSources = onRequest(qsHandler);
export const fastQuoteSources = onRequest({region: 'asia-northeast1'}, qsHandler);

const qstHandler = (req: express.Request, res: express.Response) =>
  corsHandler(req, res, () => quoteSourcesTableHandler(admin.firestore())(req, res));
export const quoteSourceTableQuery = onRequest(qstHandler);
export const fastQuoteSourceTableQuery = onRequest({region: 'asia-northeast1'}, qstHandler);

export const upsertQuoteSource = onDocumentCreated(
  'quoteSourceHistory/{historyId}',
  quoteSourceHistoryCreateHandler(admin.firestore())
);

export const setDisplayName = onCall(async (request) => {
  const db = admin.firestore();
  const displayNames = db.collection('displayNames');
  const userRoles = db.collection('userRoles');

  const uid = request.auth?.uid;
  if (uid) {
    const displayName = request.data.displayName.trim();
    if (!(typeof displayName === 'string') || displayName.length <= 3) {
      throw new HttpsError('invalid-argument', 'Missing displayName');
    }

    const unameRef: FirebaseFirestore.DocumentReference = displayNames.doc(displayName);
    const userRef: FirebaseFirestore.DocumentReference = userRoles.doc(uid);

    return await db.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
      const unameDoc = await tx.get(unameRef);
      if (unameDoc.exists && unameDoc.data()!.uid === uid) {
        throw new HttpsError('failed-precondition', 'Username already owned by requestor');
      }
      if (unameDoc.exists) {
        throw new HttpsError('failed-precondition', 'Username already taken');
      }

      const userDoc = await tx.get(userRef);
      const existingName = userDoc.data()?.displayName;
      if (existingName) {
        throw new HttpsError('failed-precondition', 'Cannot change your display name');
      }

      await tx.set(unameRef, {uid}, {merge: true});
      await tx.set(userRef, {displayName}, {merge: true});

      return {displayName, message: 'success'};
    });
  } else {
    throw new HttpsError('failed-precondition', 'Not logged in');
  }
});
