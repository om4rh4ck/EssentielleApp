const fs = require('fs');
const http = require('http');

const payload = JSON.parse(fs.readFileSync('tmp_login_payload.json', 'utf8'));

function requestJson({ method, path, headers, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4000,
        path,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : null;
            resolve({ status: res.statusCode, data: parsed, raw: data });
          } catch (e) {
            resolve({ status: res.statusCode, data: null, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const loginResp = await requestJson({
      method: 'POST',
      path: '/api/login',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!loginResp.data?.token) {
      console.error('Login failed. Status:', loginResp.status);
      console.error('Raw:', loginResp.raw);
      process.exit(1);
    }

    const token = loginResp.data.token;

    const overviewResp = await requestJson({
      method: 'GET',
      path: '/api/admin/overview',
      headers: { Authorization: 'Bearer ' + token },
    });

    console.log('LOGIN_OK tokenParts=', token.split('.').length);
    console.log('OVERVIEW_STATUS=', overviewResp.status);
    console.log(JSON.stringify(overviewResp.data ?? overviewResp.raw, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
