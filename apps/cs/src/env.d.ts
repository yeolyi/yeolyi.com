interface ImportMetaEnv {
  PUBLIC_SUPABASE_URL: string;
  PUBLIC_SUPABASE_ANON_KEY: string;
  RESEND_API_KEY: string;
  RESEND_AUDIENCE_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
