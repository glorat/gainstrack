import * as functions from 'firebase-functions';
import {authHandler, firebaseHandler, tokenHandler} from './auth';
import {quoteSourcesHandler, quoteSourcesTableHandler} from "./queries";
import cors from 'cors';
import {Request} from "firebase-functions/lib/v1/providers/https";
import {quoteSourceHistoryCreateHandler} from "./writes";

const admin = require('firebase-admin');
admin.initializeApp();
// import jwt = require('express-jwt');
import {expressjwt as jwt, GetVerificationKey} from 'express-jwt'

import jwks = require('jwks-rsa');

import express = require('express');

const whitelist = ['https://www.bogleheads.org', 'https://poc.gainstrack.com'];
const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    if (origin && whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
};

const corsHandler = cors(corsOptions);


const devConfig = {
  AUTH0_DOMAIN: 'dev-q-172al0.auth0.com', // e.g., you.auth0.com
  AUTH0_API_AUDIENCE: 'http://localhost:8080', // e.g., http://localhost:1337/
};

const jpConfig = {
  AUTH0_DOMAIN: 'gainstrack.jp.auth0.com', // e.g., you.auth0.com
  AUTH0_API_AUDIENCE: 'https://www.gainstrack.com', // e.g., http://localhost:1337/
};

// Defaulted to true for safety since only production should be minting firebase tokens
const isProd = process.env.DEV ? false : true
const config = isProd ? jpConfig : devConfig

const jwtCheck = jwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${config.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }) as GetVerificationKey,
  audience: config.AUTH0_API_AUDIENCE,
  issuer: `https://${config.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
});


// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

const allQs:(req: Request, resp: express.Response) => void | Promise<void>  = async (req, res) => {
  const x = await admin.firestore().collection('quoteSources').get();
  const ret = x.docs.map((doc: any) => {
    const data = doc.data();
    data.id = doc.id;
    return data;
  });
  res.json(ret);
};
export const getAllQuoteSources = functions
  .https
  .onRequest(allQs);

export const fastGetAllQuoteSources = functions
  .region('asia-northeast1')
  .https
  .onRequest(allQs);


const qsHandler: (req: Request, resp: express.Response) => void | Promise<void>
  = (req,res) => corsHandler(req, res, () => quoteSourcesHandler(admin.firestore())(req,res) )
export const quoteSources = functions
  .https.onRequest(qsHandler);

export const fastQuoteSources = functions
  .region('asia-northeast1')
  .https
  .onRequest(qsHandler)

// const qsqHandler: (req: Request, resp: express.Response) => void | Promise<void>
//   = (req,res) => corsHandler(req, res, () => quoteSourcesQueryHandler(admin.firestore())(req,res) )
// export const quoteSourceQuery = functions
//   .https.onRequest(qsqHandler);
//
// export const fastQuoteSourceQuery = functions
//   .region('asia-northeast1')
//   .https
//   .onRequest(qsqHandler)


const qstHandler: (req: Request, resp: express.Response) => void | Promise<void>
  = (req,res) => corsHandler(req, res, () => quoteSourcesTableHandler(admin.firestore())(req,res) )
export const quoteSourceTableQuery = functions
  .https.onRequest(qstHandler);

export const fastQuoteSourceTableQuery = functions
  .region('asia-northeast1')
  .https
  .onRequest(qstHandler)

const app = express();


app.post('/firebase', jwtCheck, firebaseHandler(admin.auth()));
app.post('/functions/auth/firebase', jwtCheck, firebaseHandler(admin.auth()));
app.get('/authorize', authHandler);
app.post('/token', tokenHandler);
app.post('/functions/auth/token', tokenHandler);
app.get('/functions/auth/authorize', authHandler);

export const auth = functions
  // .region('asia-northeast1')
  .https
  .onRequest(app)

export const upsertQuoteSource = functions.firestore
  .document('quoteSourceHistory/{historyId}')
  .onCreate(quoteSourceHistoryCreateHandler(admin.firestore()));

export const setDisplayName = functions.https.onCall(async(data,context) => {
  const db = admin.firestore();
  const displayNames = db.collection('displayNames');
  const userRoles = db.collection('userRoles');


  const uid = context.auth?.uid
  if (uid) {
    const displayName = data.displayName.trim();
    if (!(typeof displayName === 'string') || displayName.length <= 3) {
      // Throwing an HttpsError so that the client gets the error details.
      throw new functions.https.HttpsError('invalid-argument', 'Missing displayName');
    }

    let unameRef: FirebaseFirestore.DocumentReference = displayNames.doc(displayName);
    let userRef: FirebaseFirestore.DocumentReference = userRoles.doc(uid);

    return await db.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
      const unameDoc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData> = await tx.get(unameRef);
      // check if usernmae is already assigned to the current user
      if (unameDoc.exists && unameDoc.data()!.uid === uid) {
        throw new functions.https.HttpsError('failed-precondition', 'Username already owned by requestor')
      }
      // if its not assigned and exists someone else owns it
      if (unameDoc.exists) {
        throw new functions.https.HttpsError('failed-precondition', 'Username already taken');
      }

      // check if user already has one
      const userDoc = await tx.get(userRef);
      const existingName = userDoc.data()?.displayName;
      if (existingName) {
        throw new functions.https.HttpsError('failed-precondition', 'Cannot change your display name');
      }

      // All checks passed! Let's update all

      // assign the username to the authenticated user
      await tx.set(unameRef, { uid }, {merge:true});
      await tx.set(userRef, {displayName}, {merge:true});

      return {displayName, message:'success'};
    })


  } else {
    throw new functions.https.HttpsError('failed-precondition', 'Not logged in')
  }
});
