import split from 'split';

const hash = {};
const valid = {};

function add(node) {
  const key = `${node.src} ${node.dst}`;
  if (!valid[node.dst]) valid[node.dst] = true;
  if (!hash[key]) {
    hash[key] = {
      src: node.src,
      dst: node.dst,
      w: 0,
    };
  }
  hash[key].w++;
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
