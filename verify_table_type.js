const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple parse .env.local
const envConfig = {};
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEq = trimmed.indexOf('=');
    if (firstEq === -1) return;
    const key = trimmed.substring(0, firstEq).trim();
    const val = trimmed.substring(firstEq + 1).trim();
    envConfig[key] = val;
  });
} catch(e) {
  console.error("Failed to read .env.local", e);
}

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTable() {
  console.log("Checking scheduled_emails details...");
  
  // Let's run a query using POST to check if the schema lists it as a table
  // We can query the pg_catalog via an RPC or try an insert.
  // Wait, if it's a view, we can select but we might not be able to insert easily or it would show in PostgREST.
  // Actually, we can run a custom request to get Swagger API docs from PostgREST!
  // The PostgREST API docs list all tables and views in the public schema!
  // Let's fetch the OpenAPI spec from the Supabase REST endpoint:
  // endpoint: `${supabaseUrl}/rest/v1/`
  const restUrl = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;
  try {
    const res = await fetch(restUrl);
    const schema = await res.json();
    console.log("Public schema definitions:", Object.keys(schema.definitions || {}));
    if (schema.definitions && schema.definitions.scheduled_emails) {
      console.log("scheduled_emails definition found in OpenAPI spec:", schema.definitions.scheduled_emails);
    } else {
      console.log("scheduled_emails NOT found in OpenAPI spec definitions!");
    }
  } catch(e) {
    console.error("Failed to fetch OpenAPI schema:", e);
  }
}

verifyTable();
