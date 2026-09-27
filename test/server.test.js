import { test, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { createServer } from '../server.js';

let server;
let baseUrl;

before(async () => {
  server = createServer();
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(url, options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          text: () => body.toString('utf8'),
          json: () => JSON.parse(body.toString('utf8')),
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

test('GET / serves index.html with correct headers', async () => {
  const res = await request('/');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.ok(res.text().includes('<title>Financopedia</title>'));
  assert.ok(res.text().includes('id="app"'));
});

test('GET /robots.txt serves robots file', async () => {
  const res = await request('/robots.txt');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/plain/);
  assert.ok(res.text().includes('User-agent'));
});

test('GET /sitemap.xml serves sitemap', async () => {
  const res = await request('/sitemap.xml');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /application\/xml/);
  assert.ok(res.text().includes('<urlset'));
});

test('GET /bird.svg serves svg illustration', async () => {
  const res = await request('/bird.svg');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /image\/svg\+xml/);
});

test('GET /favicon.ico serves favicon', async () => {
  const res = await request('/favicon.ico');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /image\/x-icon/);
});

test('GET /default-avatar.png serves default avatar image', async () => {
  const res = await request('/default-avatar.png');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /image\/png/);
});

test('GET /assets/index-Dg23-Yg1.js serves javascript with immutable cache', async () => {
  const res = await request('/assets/index-Dg23-Yg1.js');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /application\/javascript/);
  assert.ok(res.headers['cache-control'].includes('immutable'));
});

test('GET /assets/index-NUmzW8Nl.css serves css with immutable cache', async () => {
  const res = await request('/assets/index-NUmzW8Nl.css');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/css/);
  assert.ok(res.headers['cache-control'].includes('immutable'));
});

test('GET /assets/logo-white-jtmy17O_.png serves logo image', async () => {
  const res = await request('/assets/logo-white-jtmy17O_.png');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /image\/png/);
});

test('GET /assets/fa-solid-900-DRAAbZTg.woff2 serves web font', async () => {
  const res = await request('/assets/fa-solid-900-DRAAbZTg.woff2');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /font\/woff2/);
});

test('SPA fallback: GET /login serves index.html', async () => {
  const res = await request('/login');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.ok(res.text().includes('<title>Financopedia</title>'));
});

test('SPA fallback: GET /archive serves index.html', async () => {
  const res = await request('/archive');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/html/);
});

test('SPA fallback: GET /team serves index.html', async () => {
  const res = await request('/team');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/html/);
});

test('SPA fallback: GET /camps/12/leaderboard serves index.html', async () => {
  const res = await request('/camps/12/leaderboard');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/html/);
});

test('SPA fallback: GET /explore/1/team/2 serves index.html', async () => {
  const res = await request('/explore/1/team/2');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/html/);
});

test('Non-existent asset returns 404', async () => {
  const res = await request('/assets/nonexistent-file.png');
  assert.strictEqual(res.statusCode, 404);
});

test('Gzip compression is applied when requested', async () => {
  const res = await request('/', {
    headers: { 'Accept-Encoding': 'gzip' },
  });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['content-encoding'], 'gzip');
});

test('Unsupported HTTP methods on static content return 405', async () => {
  const res = await request('/', { method: 'POST' });
  assert.strictEqual(res.statusCode, 405);
});

test('Directory traversal attempts return 403', async () => {
  const res = await request('/..%2f..%2fetc/passwd');
  assert.strictEqual(res.statusCode, 403);
});

test('API proxy: GET /landing-categories/ returns live backend JSON', async () => {
  const res = await request('/landing-categories/');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /application\/json/);
  const data = res.json();
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0);
  assert.ok(data[0].id !== undefined);
});

test('API proxy: GET /camps/list/ returns live camp records', async () => {
  const res = await request('/camps/list/');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /application\/json/);
  const data = res.json();
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0);
  assert.ok(data[0].name.includes('Financopedia'));
});

test('API proxy: GET /users/public-team/ returns team data', async () => {
  const res = await request('/users/public-team/');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /application\/json/);
  const data = res.json();
  assert.ok(Array.isArray(data));
  assert.ok(data.length > 0);
});

test('API proxy: GET /users/top/ returns leaderboard rankings', async () => {
  const res = await request('/users/top/');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /application\/json/);
  const data = res.json();
  assert.ok(data.results && Array.isArray(data.results));
});

test('Media proxy: GET /media/uploads/... streams image from upstream', async () => {
  const res = await request('/media/uploads/25ba3073-efc3-40a0-8589-d3269afe5e7b.jpg');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /image\/jpeg/);
  assert.ok(res.body.length > 1000);
});

test('API proxy: POST /auth/login/ forwards request body to upstream', async () => {
  const body = JSON.stringify({ phone_number: '+998901234567', password: 'bad_password' });
  const res = await request('/auth/login/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
    body,
  });
  // Upstream rejects invalid credentials with 401 (not 405 Method Not Allowed)
  assert.strictEqual(res.statusCode, 401);
  const data = res.json();
  assert.ok(data.error !== undefined);
});

test('API proxy: returns 502 Bad Gateway when upstream is unreachable', async () => {
  const badServer = createServer({ apiTarget: 'http://127.0.0.1:59999' });
  let badPort;
  await new Promise((resolve) => {
    badServer.listen(0, '127.0.0.1', () => {
      badPort = badServer.address().port;
      resolve();
    });
  });

  try {
    const res = await new Promise((resolve, reject) => {
      const req = http.request(`http://127.0.0.1:${badPort}/landing-categories/`, (r) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => {
          resolve({
            statusCode: r.statusCode,
            json: () => JSON.parse(Buffer.concat(chunks).toString('utf8')),
          });
        });
      });
      req.on('error', reject);
      req.end();
    });

    assert.strictEqual(res.statusCode, 502);
    const data = res.json();
    assert.strictEqual(data.error, 'Bad Gateway');
  } finally {
    await new Promise((resolve) => badServer.close(resolve));
  }
});
