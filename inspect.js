import fs from 'fs';
import split from 'split';

const data = [];

process.stdin
  .pipe(split())
  .on('data', line => {
    try {
      if(line.startsWith('POST')) {
        const item = JSON.parse(line.replace(/^POST /,''));
        data.push(item);
      }
    } catch (e) {
      console.error(line);
      console.error(e.stack);
    }
  })
  .on('end', () => {

    const gs = groupBy('dst', data);
    const gss = groupBy(item => `"${item.src}" -> "${item.dst}"`, data);
    const valid = gs.reduce((valid, item) => {
      valid[item.key] = true;
      return valid;
    }, {});

    const edges = gss.filter(item => {
      return item.items[0].src != null && valid[item.items[0].src];
    }).map(item => `  ${item.key};`).join('\n');

    // const nodes = gs.map(bucket => {
    //   const p = Math.floor(bucket.items.filter(item => item.comment).length / bucket.items.length * 256);
    //   const color = ('00' + p.toString(16)).slice(-2) + '0000'
    //   const color = bucket.items.some(item => item.comment && item.comment.match(/halott pénz/i)) ? 'red' : 'white';
    //   return `  "${bucket.key}" [ fillcolor=${color} ];`;
    // }).join('\n');
    const nodes = '';

    console.log(`digraph {
  graph [ overlap=false; outputorder=edgesfirst ];
  edge [ color="#00000066" ];
  node [ fillcolor=white; style=filled, fontname="Helvetica Neue LT Pro", shape=box ];
  ${edges}
  ${nodes}
}`);
  });

function groupBy(fn, arr) {
  if (typeof fn === 'string') {
    const key = fn;
    fn = item => item[key]
  }
  const groups = {};
  for (const item of arr) {
    const key = fn(item);
    if (!groups[key]) {
      groups[key] = {
        key,
        items: [],
      };
    }
    groups[key].items.push(item);
  }
  return Object.keys(groups).map(key => groups[key]);
}

