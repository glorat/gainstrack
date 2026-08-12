// GPL-2.0-only — see ./LICENSE.

/// <reference types="vite/client" />

/** `dump.py` is imported as text so the site ships the same script the CLI runs. */
declare module '*.py?raw' {
  const source: string;
  export default source;
}

interface ImportMetaEnv {
  /** Comma-separated origins allowed to embed `/embed.html`. Empty means any. */
  readonly VITE_EMBED_ORIGINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
