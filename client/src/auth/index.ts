import Auth0Client from '@auth0/auth0-spa-js/dist/typings/Auth0Client';
import Vue from 'vue';
import createAuth0Client, {
    getIdTokenClaimsOptions,
    GetTokenSilentlyOptions,
    GetTokenWithPopupOptions, LogoutOptions,
    PopupLoginOptions, RedirectLoginOptions
} from '@auth0/auth0-spa-js';
import {PluginFunction, PluginObject} from 'vue/types/plugin';

/** Define a default action to perform after authentication */
const DEFAULT_REDIRECT_CALLBACK: any = () =>
  window.history.replaceState({}, document.title, window.location.pathname);

let instance: Vue | null;

/** Returns the current instance of the SDK */
export const getInstance = () => instance;

interface MyData {
  loading: boolean,
  isAuthenticated: boolean,
  user: object,
  auth0ClientPromise: Promise<Auth0Client>,
  auth0Client: Auth0Client,
  popupOpen: boolean,
  error: null|string,
}

/** Creates an instance of the Auth0 SDK. If one has already been created, it returns that instance */
export const useAuth0 = ({
  onRedirectCallback = DEFAULT_REDIRECT_CALLBACK,
  redirectUri = window.location.origin,
  ...options
}) => {
  if (instance) {return instance};

  // The 'instance' is simply a Vue object
  instance = new Vue({
    data(): MyData {
      return {
        loading: true,
        isAuthenticated: false,
        user: {},
        // @ts-ignore
        auth0ClientPromise: null,
        // @ts-ignore
        auth0Client: null,
        popupOpen: false,
        error: null
      };
    },
    methods: {
      /** Authenticates the user using a popup window */
      async loginWithPopup(o?: PopupLoginOptions) {
        this.popupOpen = true;

        try {
          await this.auth0Client.loginWithPopup(o);
        } catch (e) {
          // eslint-disable-next-line
          // tslint:disable-next-line:no-console
          console.error(e);
        } finally {
          this.popupOpen = false;
        }

        this.user = await this.auth0Client.getUser();
        this.isAuthenticated = true;
      },
      /** Handles the callback when logging in using a redirect */
      async handleRedirectCallback() {
        this.loading = true;
        try {
          await this.auth0Client.handleRedirectCallback();
          this.user = await this.auth0Client.getUser();
          this.isAuthenticated = true;
        } catch (e) {
          this.error = e;
        } finally {
          this.loading = false;
        }
      },
      /** Authenticates the user using the redirect method */
      loginWithRedirect(o?: RedirectLoginOptions) {
        return this.auth0Client.loginWithRedirect(o);
      },
      /** Returns all the claims present in the ID token */
      getIdTokenClaims(o?: getIdTokenClaimsOptions) {
        return this.auth0Client.getIdTokenClaims(o);
      },
      /** Returns the access token. If the token is invalid or missing, a new one is retrieved */
      getTokenSilently(o?: GetTokenSilentlyOptions) {
        return this.auth0Client.getTokenSilently(o);
      },
      /** Gets the access token using a popup window */

      getTokenWithPopup(o?: GetTokenWithPopupOptions) {
        return this.auth0Client.getTokenWithPopup(o);
      },
      /** Logs the user out and removes their session on the authorization server */
      logout(o?: LogoutOptions) {
        return this.auth0Client.logout(o);
      }
    },
    /** Use this lifecycle method to instantiate the SDK client */
    async created() {
        const moreOpts = {
            useRefreshTokens: true,
            cacheLocation: (process.env.NODE_ENV === 'development') ? 'localstorage' : 'memory' as "memory"|"localstorage"
        };
        
      // Create a new instance of the SDK client using members of the given options object
      this.auth0ClientPromise = createAuth0Client({
        domain: options.domain,
        client_id: options.clientId,
        audience: options.audience,
        redirect_uri: redirectUri,
        ...moreOpts
      }).then(client => {
          this.auth0Client = client;
          return client;
      })

      const client = await this.auth0ClientPromise;

      try {
        // If the user is returning to the app after authentication..
        if (
          window.location.search.includes('code=') &&
          window.location.search.includes('state=')
        ) {
          // handle the redirect and retrieve tokens
          const { appState } = await client.handleRedirectCallback();

          // Notify subscribers that the redirect callback has happened, passing the appState
          // (useful for retrieving any pre-authentication state)
          onRedirectCallback(appState);
        }
      } catch (e) {
        this.error = e;
      } finally {
        // Initialize our internal authentication state
        this.isAuthenticated = await client.isAuthenticated();
        this.user = await client.getUser();
        this.loading = false;
      }
    }
  });

  return instance;
};

// Create a simple Vue plugin to expose the wrapper object throughout the application
export const Auth0Plugin = {
  install(vue: any, options: object) {
    vue.prototype.$auth = useAuth0(options);
  }
};
