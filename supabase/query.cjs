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

function runQuery(sql) {
  return new Promise((resolve, reject) => {
    if (!token) return reject(new Error("No Supabase access token found"));
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
            reject(new Error("API Error " + res.statusCode + ": " + JSON.stringify(parsed)));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { runQuery, getToken };

if (require.main === module) {
  const sql = process.argv.slice(2).join(' ') || process.env.SQL_QUERY;
  if (!sql) {
    console.error('Usage: node supabase/query.cjs "<SQL_STATEMENT>"');
    process.exit(1);
  }
  runQuery(sql)
    .then(res => {
      if (Array.isArray(res) && res.length > 0 && typeof res[0] === 'object') {
        console.table(res);
      } else {
        console.log(res);
      }
    })
    .catch(err => {
      console.error(err.message);
      process.exit(1);
    });
}
