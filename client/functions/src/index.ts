import * as functions from 'firebase-functions';

const {createHash} = require('crypto');

const admin = require('firebase-admin');
admin.initializeApp();

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const getAllQuoteSources = functions
  // .region('asia-northeast1')
  .https
  .onRequest(async (req, res) => {
    const x = await admin.firestore().collection('quoteSources').get();
    const ret = x.docs.map((doc: any) => {
      const data = doc.data();
      data.id = doc.id;
      return data;
    });
    res.json(ret);
  });

import jwt = require('express-jwt');

import jwks = require('jwks-rsa');

import express = require('express');


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


function javaHash(input:string) {
  const md5Bytes = createHash('md5').update(input).digest();
  md5Bytes[6]  &= 0x0f;  /* clear version        */
  md5Bytes[6]  |= 0x30;  /* set to version 3     */
  md5Bytes[8]  &= 0x3f;  /* clear variant        */
  md5Bytes[8]  |= 0x80;  /* set to IETF variant  */
  const hex = md5Bytes.toString('hex')
  const uuid = hex.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, "$1-$2-$3-$4-$5");
  return uuid;
}

const app = express();

app.post('/firebase', jwtCheck, async (req, res) => {
  // Create UID from authenticated Auth0 user
  // @ts-ignore
  const uid = req.user.sub;
  // Mint token
  try {
    // Convert the provider free string uid to a uuid in the same way the official backend does
    const uuid = javaHash(uid);
    const customToken = await admin.auth().createCustomToken(uuid);

    res.json({firebaseToken: customToken, uuid})
  } catch (err) {
    res.status(500).send({
      message: 'Something went wrong acquiring a Firebase token.',
      error: err,
    })
  }
});


export const auth = functions
  // .region('asia-northeast1')
  .https
  .onRequest(app)
