import api from './api';

async function lastPosts(name) {
  let offset = 0;
  let batch = [];
  const size = 5;
  const posts = [];
  for (let i = 0; i < 5; i++) {
    if (batch.length < size) {
      batch.push(api('GET', `/v2/blog/${name}.tumblr.com/posts`, {
        reblog_info: true,
        offset,
      }));
      offset += 20;
    }
    if (batch.length >= size) {
      const results = await Promise.all(batch);
      batch = [];
      for (const result of results) {
        posts.push.apply(posts, result.response.response.posts.map(post => ({
          type: post.type,
          date: new Date(post.timestamp * 1000),
          src: post.reblogged_from_name || null,
          dst: name,
          comment: post.reblog ? post.reblog.comment : null,
        })));
      }
    }
  }
  return posts;
}

const triggers = [
  /\b(a|e)zt?\b/i,
  /(\s+|\.|,|^)é(n|s)\b/i,
  /\bmost\b/i,
  /\bmert\b/i,
  /\bnapom\b/i,
  /\bigen\b/i,
  /\bmég\b/i,
  /\bhát\b/i,
  /\bsör\b/i,
  /\bkell\b/i,
  /\bhogy\b/i,
  /\brossz\b/i,
  /\bmár\b/i,
]

const queue = [{
  name: 'napszemuvegbe',
  weight: 1,
}];

const visited = [];
const start = Date.now();

async function pick() {
  while (!queue.length) await sleep(1000);

  const estimate = Math.ceil((Date.now() - start) / visited.length * queue.length / 1000 / 60);
  const item = queue.shift();
  visited.push(item.name);
  process.stderr.write(`\x1b[Kcurrent: ${item.name}. ${visited.length} done, ${queue.length} remaining (estimate: ${estimate} min) [${queue.slice(0, 5).map(i => i.name + ':' + i.weight).join(',')}]\r`)

  try {
    const posts = await lastPosts(item.name);

    const sources = {};
    let pass = false;
    for (const post of posts) {
      if (!post.comment) continue;
      if (post.comment.match(/ő|ű/i) || triggers.some(word => post.comment.match(word))) {
        if (!pass) {
          console.error('\x1b[K' + item.name + ' PASS: ' + post.comment.replace(/<.*?>|\n/g, ''));
        }
        pass = true;
      }
      if (!sources[post.src]) sources[post.src] = 0;
      sources[post.src]++;
    }

    if (!pass) {
      const words = {};
      for (const post of posts) {
        if (!post.comment) continue;
        for (const word of post.comment.replace(/<.*?>/g, '').split(/\s+/)) {
          words[word] = (words[word] || 0) + 1;
        }
      }
      console.error('\x1b[K\x1b[30;41m%s DROP: %s\x1b[37;40m', item.name, Object.keys(words).sort((a, b) => a.length - b.length).slice(0, 20).join(','));
      return;
    }

    for (const post of posts) {
      console.log(JSON.stringify(post));
    }

    for (const source of Object.keys(sources)) {
      if (visited.indexOf(source) > -1) continue;
      const item = queue.filter(item => item.name == source)[0];
      if (item) {
        item.weight += 1; // sources[source];
      } else {
        queue.push({
          name: source,
          weight: 1, //sources[source],
        });
      }
    }

    queue.sort((a, b) => b.weight - a.weight);
  } catch (e) {
    console.error('\x1b[K\x1b[30;41m%s FAILED: %s\x1b[37;40m', item.name, e.message);
    item.weight = 0;
    queue.push(item);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function dump() {
  for (;;) {
    const batch = [];
    for (let i = 0; i < 20; i++) {
      batch.push(pick());
    }
    await Promise.all(batch);
  }
}

dump().catch(err => console.error(err.stack));
