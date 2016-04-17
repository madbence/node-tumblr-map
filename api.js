import https from 'https';
import crypto from 'crypto';
import uuid from 'uuid';
import {stringify} from 'querystring';

const oauth = {
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  token: process.env.TOKEN,
  token_secret: process.env.TOKEN_SECRET,
};

function sign(method, path, query) {
  const params = {
    oauth_consumer_key: oauth.consumer_key,
    oauth_token: oauth.token,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000),
    oauth_nonce: uuid.v4(),
    oauth_version: '1.0',
  };
  Object.keys(query).forEach(key => params[key] = query[key]);
  const base = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  const hash = `${method}&${encodeURIComponent('https://api.tumblr.com' + path)}&${encodeURIComponent(base)}`
  const hmac = crypto.createHmac('sha1', `${oauth.consumer_secret}&${oauth.token_secret}`);
  hmac.update(hash);
  params.oauth_signature = hmac.digest('base64');
  return 'OAuth ' + Object.keys(params).map(key => `${key}="${params[key]}"`).join(',');
}

function findRateLimitHeader(headers, name) {
  return Object.keys(headers).filter(header => header.match('ratelimit') && header.match(name)).map(header => headers[header])[0];
}

function request(method, path, query) {
  const date = new Date();
  const qs = stringify(query);
  const auth = sign(method, path, query);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), 10000);
    const req = https.request({
      method: method,
      host: 'api.tumblr.com',
      path: path + (qs ? '?' + qs : ''),
      headers: {
        Authorization: auth,
      },
    }, function (res) {
      let data = '';
      res
        .on('data', chunk => data += chunk)
        .on('end', () => {
          try {
            const response = JSON.parse(data);
            const limit = findRateLimitHeader(res.headers, '-limit');
            const remaining = findRateLimitHeader(res.headers, '-remaining');
            const reset = findRateLimitHeader(res.headers, '-reset');
            // process.stderr.write(`${res.statusCode} (${remaining}/${limit})\n`);
            resolve({
              headers: res.headers,
              response: response,
              ratelimit: {
                limit: limit,
                remaining: remaining,
                reset: (new Date(reset * 1000) - new Date(res.headers.date)),
              },
            });
            clearTimeout(timer);
          } catch (e) {
            // console.error(res.headers, res.status, data);
            reject(e);
          }
        })
        .on('error', reject);
    }).on('error', reject).end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function api(method, path, query, n = 5) {
  try {
    const res = await request(method, path, query);
    if (res.response.meta.status === 429) {
      await sleep(1000)
      return await api(method, path, query);
    }
    if (res.ratelimit.remaining === 0) {
      await sleep(res.ratelimit.reset);
      return await api(method, path, query);
    }
    return res;
  } catch (err) {
    console.error('ERR %s (%s)', err.message, path);
    if (err.code === 'ECONNRESET' || err.message === 'timeout' || err.message.match(/Unexpected end/)) {
      if (!n) throw err;
      return await api(method, path, query, n - 1);
    }
    throw err;
  }
}

export default api;
