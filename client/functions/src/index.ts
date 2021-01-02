import * as functions from 'firebase-functions';
const admin = require('firebase-admin');
admin.initializeApp();
import jwt = require('express-jwt');

import jwks = require('jwks-rsa');

import express = require('express');
import {firebaseHandler} from "./auth";
import {quoteSourcesHandler} from "./queries";
import * as cors from 'cors';
import {Request} from "firebase-functions/lib/providers/https";

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
  }),
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

const app = express();


app.post('/firebase', jwtCheck, firebaseHandler(admin.auth()));
app.post('/functions/auth/firebase', jwtCheck, firebaseHandler(admin.auth()));


export const auth = functions
  // .region('asia-northeast1')
  .https
  .onRequest(app)
