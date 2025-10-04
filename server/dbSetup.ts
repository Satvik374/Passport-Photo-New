import { pool } from './db';

export async function ensureDatabaseSchema(): Promise<void> {
  try {
    console.log('🔧 Checking database schema...');
    
    const schema = `
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS sessions (
        sid            varchar PRIMARY KEY,
        sess           jsonb    NOT NULL,
        expire         timestamp NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_session_expire ON sessions(expire);

      CREATE TABLE IF NOT EXISTS users (
        id                  varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        email               varchar UNIQUE,
        first_name          varchar,
        last_name           varchar,
        profile_image_url   varchar,
        is_guest            boolean DEFAULT false,
        password_hash       varchar,
        auth_provider       varchar DEFAULT 'email',
        is_email_verified   boolean DEFAULT false,
        created_at          timestamp DEFAULT now(),
        updated_at          timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS email_verifications (
        id                 varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        email              varchar NOT NULL,
        verification_code  varchar NOT NULL,
        expires_at         timestamp NOT NULL,
        used               boolean DEFAULT false,
        created_at         timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS pending_registrations (
        id                 varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        email              varchar UNIQUE NOT NULL,
        first_name         varchar NOT NULL,
        last_name          varchar NOT NULL,
        password_hash      varchar NOT NULL,
        verification_code  varchar NOT NULL,
        expires_at         timestamp NOT NULL,
        created_at         timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS uploaded_images (
        id                          text PRIMARY KEY,
        user_id                     varchar REFERENCES users(id) ON DELETE CASCADE,
        filename                    text NOT NULL,
        original_name               text NOT NULL,
        mime_type                   text NOT NULL,
        size                        integer NOT NULL,
        uploaded_at                 timestamp NOT NULL DEFAULT now(),
        background_removed_filename text
      );

      CREATE TABLE IF NOT EXISTS layout_results (
        id                  text PRIMARY KEY,
        image_id            text NOT NULL REFERENCES uploaded_images(id) ON DELETE CASCADE,
        settings            json NOT NULL,
        crop_settings       json,
        photos_per_row      integer NOT NULL,
        total_rows          integer NOT NULL,
        page_utilization    real NOT NULL,
        processed_image_url text NOT NULL,
        border_width        real NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS presets (
        id           text PRIMARY KEY,
        user_id      varchar REFERENCES users(id) ON DELETE CASCADE,
        name         text NOT NULL,
        description  text,
        settings     json NOT NULL,
        border_width real NOT NULL DEFAULT 0,
        created_at   timestamp NOT NULL DEFAULT now()
      );
    `;

    await pool.query(schema);
    console.log('✅ Database schema is ready');
  } catch (error) {
    console.error('❌ Failed to set up database schema:', error);
    throw error;
  }
}
