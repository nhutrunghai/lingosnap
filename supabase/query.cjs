const https = require('https');
const { execSync } = require('child_process');

function getToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  try {
    const out = execSync('reg query HKCU\\Environment /v SUPABASE_ACCESS_TOKEN', { encoding: 'utf8' });
    const match = out.match(/SUPABASE_ACCESS_TOKEN\s+REG_\w+\s+(\S+)/);
    if (match) return match[1];
  } catch {}
  return null;
}

const token = getToken();
if (!token) {
  console.error("No Supabase access token found in environment or registry.");
  process.exit(1);
}

const sql = process.argv.slice(2).join(' ') || process.env.SQL_QUERY;
if (!sql) {
  console.error("Usage: node supabase/query.cjs \"<SQL_STATEMENT>\"");
  process.exit(1);
}

const payload = JSON.stringify({ query: sql });
const req = https.request({
  hostname: 'api.supabase.com',
  path: '/v1/projects/qyfpcpiposwogdicojgh/database/query',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (res.statusCode >= 400) {
        console.error("API Error (" + res.statusCode + "):", parsed);
        process.exit(1);
      }
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && typeof parsed[0] === 'object') {
          console.table(parsed);
        } else {
          console.log(parsed);
        }
      } else {
        console.log(parsed);
      }
    } catch {
      console.log(data);
    }
  });
});

req.on('error', (err) => {
  console.error("Network error:", err);
  process.exit(1);
});

req.write(payload);
req.end();
