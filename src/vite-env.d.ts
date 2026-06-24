/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UPDATE_PUBKEY: string
  readonly VITE_RELAY_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
