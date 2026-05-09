const fs = require('fs');
const path = require('path');

function tryReadJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw.match(/\{[\s\S]*\}$/)?.[0] ?? null;
}

const cwdCandidate = path.join(process.cwd(), 'token_resp.json');
const dirCandidate = path.join(__dirname, 'token_resp.json');

const rawJson =
  tryReadJsonFile(cwdCandidate) ??
  tryReadJsonFile(dirCandidate);

if (!rawJson) {
  throw new Error('Cannot find token_resp.json. Tried: ' + cwdCandidate + ' and ' + dirCandidate);
}

const parsed = JSON.parse(rawJson.trim());
const token = parsed.token;

if (!token) {
  throw new Error('No token found in token_resp.json');
}

const http = require('http');
const req = http.request(
  {
    hostname: 'localhost',
    port: 4000,
    path: '/api/admin/overview',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
  },
  (res) => {
    let d = '';
    res.on('data', (c) => (d += c));
    res.on('end', () => process.stdout.write(d));
  }
);

req.on('error', (e) => {
  console.error(e);
  process.exit(1);
});

req.end();
