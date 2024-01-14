import {RequestHandler, Request, Response} from "express";
import {Auth} from "firebase-admin/auth";
import axios from 'axios';

const {createHash} = require('crypto');

const AUTHORIZATION_URL = 'https://gainstrack.jp.auth0.com/authorize'
const TOKEN_URL = 'https://gainstrack.jp.auth0.com/oauth/token'

function javaHash(input: string) {
  const md5Bytes = createHash('md5').update(input).digest();
  md5Bytes[6] &= 0x0f;  /* clear version        */
  md5Bytes[6] |= 0x30;  /* set to version 3     */
  md5Bytes[8] &= 0x3f;  /* clear variant        */
  md5Bytes[8] |= 0x80;  /* set to IETF variant  */
  const hex = md5Bytes.toString('hex')
  const uuid = hex.replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, "$1-$2-$3-$4-$5");
  return uuid;
}

export const firebaseHandler:  ((fbauth:Auth) => RequestHandler)= (fbauth) => async (req, res) => {
  // Create UID from authenticated Auth0 user
  // @ts-ignore
  const uid = req.user.sub;
  // Mint token
  try {
    // Convert the provider free string uid to a uuid in the same way the official backend does
    const uuid = javaHash(uid);
    // TODO: Port the auth0 claims to fb in the second argument
    const customToken = await fbauth.createCustomToken(uuid);

    res.json({firebaseToken: customToken, uuid})
  } catch (err) {
    res.status(500).send({
      message: 'Something went wrong acquiring a Firebase token.',
      error: err,
    })
  }
};

/// Middleware to redirect to the Auth0 authorization endpoint
export const authHandler: RequestHandler = (req, res) => {
  // Construct the full URL for the Auth0 authorize endpoint with the query parameters
  const auth0AuthorizeUrl = `${AUTHORIZATION_URL}?${req.url.split('?')[1]}`;

  // Redirect the client to the constructed URL
  res.redirect(auth0AuthorizeUrl);
};

// Middleware to proxy the token request to Auth0
export const tokenHandler: RequestHandler = async (req, res) => {
  try {
    const form_data = req.body;
    const auth0Response = await axios.post(TOKEN_URL, form_data);

    res.json(auth0Response.data);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
