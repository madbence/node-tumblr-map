import split from 'split';

const hash = {};
const valid = {};

function add(node) {
  const key1 = `${node.src} ${node.dst}`;
  const key2 = `${node.dst} ${node.src}`;
  if (!valid[node.dst]) valid[node.dst] = true;
  if (!hash[key1] && !hash[key2]) {
    hash[key1] = {
      src: node.src,
      dst: node.dst,
      w: 0,
    };
    hash[key1].w++;
  } else if (hash[key2]) {
    hash[key2].w++;
  } else {
    hash[key1].w++;
  }
}

process.stdin
  .pipe(split())
  .on('data', line => {
    if (!line) return;
    try {
      const item = JSON.parse(line);
      if (!item.src) return;
      add(item);
    } catch (err) {
      console.error(err.stack);
    }
  })
  .once('end', () => {
    const items = Object.keys(hash).map(key => hash[key]).filter(edge => valid[edge.src]);
    for (const item of items) {
      console.log(JSON.stringify(item));
    }
  });
