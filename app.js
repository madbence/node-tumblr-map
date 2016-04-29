import api from './api';
import cld from 'cld';

function extractUsefulPostData(post, name) {
  return {
    id: post.id,
    src_id: post.reblogged_from_id || null,
    type: post.type,
    date: new Date(post.timestamp * 1000),
    src: post.reblogged_from_name || null,
    dst: name,
    root: post.reblogged_root_name || null,
    root_id: post.reblogged_root_id || null,
    comment: post.reblog ? post.reblog.comment : null,
    root_comment: (post.trail && post.trail[0] && post.trail[0].content) || null,
    trail: (post.trail ? post.trail.map(trail => ({
      content: trail.content,
      id: trail.post.id,
      src: trail.blog.name
    })) : null),
    tags: post.tags
  };
}

function extractUsefulLikeData(like, name) {
  return {
    src: name,
    dst: like.blog_name,
    post_id: like.id
  };
}

async function lastLikes(name) {
  let startTime = (new Date().getTime() - 24*60*60*14 * 1000) / 1000; // two weeks
  let offset = 0;
  let batch = [];
  const likes = [];
  let okay = false;
  while (!okay) {
    for (let i = 0; i < 10; i++) {
      batch.push(api('GET', `/v2/blog/${name}.tumblr.com/likes`, {
        offset: offset
      }));
      offset += 20;
    }

    const results = await Promise.all(batch);
    batch = [];
    for (const result of results) {
      // this is only allowed on some blogs :(
      const resultLikes = result.response.response.liked_posts;
      if (!resultLikes || offset>=1000 || resultLikes.length == 0 || resultLikes[0].timestamp < startTime) {
        okay = true;
      }
      if (resultLikes) {
        likes.push.apply(likes, resultLikes.map(like => extractUsefulLikeData(like,name)));
      }
    }
  }
  return likes;
}

async function lastPosts(name) {
  let startTime = (new Date().getTime() - 24*60*60*14 * 1000) / 1000; // two weeks
  let offset = 0;
  let batch = [];
  const posts = [];
  let okay = false;
  while (!okay) {
    for (let i = 0; i < 5; i++) {
      batch.push(api('GET', `/v2/blog/${name}.tumblr.com/posts`, {
        reblog_info: true,
        offset: offset,
      }));
      offset += 20;
    }

    const results = await Promise.all(batch);
    batch = [];
    for (const result of results) {
      const resultPosts = result.response.response.posts;
      if (resultPosts.length == 0 || resultPosts[0].timestamp < startTime) {
        okay = true;
      }
      posts.push.apply(posts, resultPosts.map(post => extractUsefulPostData(post,name)));
    }
  }
  return posts;
}

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
      cld.detect(post.comment, function(err, result) {
        if (result && result.reliable && result.languages[0].name=='HUNGARIAN') {
          if (!pass) {
            console.error('\x1b[K' + item.name + ' PASS: ' + post.comment.replace(/<.*?>|\n/g, ''));
          }
          pass = true;
        }
      });
      if (!sources[post.src]) sources[post.src] = 0;
      sources[post.src]++;
    }

    if (!pass) {
      console.error('\x1b[K\x1b[30;41m%s DROP\x1b[37;40m', item.name);
      return;
    }

    for (const post of posts) {
      console.log("POST " + JSON.stringify(post));
    }

    const likes = await lastLikes(item.name);

    for (const like of likes) {
      console.log("LIKE " + JSON.stringify(like));
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
    console.error('\x1b[K\x1b[30;41m%s FAILED: %s\x1b[37;40m', item.name, e.message + e.stack);
    if (item.weight) {
      item.weight = 0;
      queue.push(item);
    }
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
