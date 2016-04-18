import split from 'split';

const nodes = {};
const edges = [];

function add(edge) {
  if (!nodes[edge.dst]) nodes[edge.dst] = {
    name: edge.dst,
    neighbours: [],
  };
  if (!nodes[edge.src]) nodes[edge.src] = {
    name: edge.src,
    neighbours: [],
  };
  nodes[edge.dst].neighbours.push(edge.src);
}

process.stdin
  .pipe(split())
  .on('data', line => {
    if (!line) return;
    try {
      const item = JSON.parse(line);
      if (!item.src) return;
      add(item);
      edges.push(item);
    } catch (err) {
      console.error(err.stack);
    }
  })
  .once('end', () => {
    const nodeList = Object.keys(nodes).map(key => nodes[key]);
    const forest = nodeList.map(node => [node.name]);
    const sorted = edges.sort((a, b) => b.w - a.w);
    const minSpanTree = [];
    for (const edge of sorted) {
      let srcForest, dstForest;
      for (const tree of forest) {
        if (tree.indexOf(edge.src) > -1) srcForest = tree;
        if (tree.indexOf(edge.dst) > -1) dstForest = tree;
        if (srcForest && dstForest) break;
      }
      if (!srcForest || !dstForest) {
        console.log(srcForest, dstForest, edge);
        console.log(nodes[edge.src], nodes[edge.dst]);
        throw new Error('...');
      }
      if (srcForest != dstForest) {
        forest.splice(forest.indexOf(srcForest), 1);
        dstForest.push.apply(dstForest, srcForest);
        minSpanTree.push(edge);
      }
      process.stderr.write('tree size: ' + minSpanTree.length + '/' + nodeList.length + ' \r');
    }
    console.log('graph {');
    console.log('  graph [ overlap=false; outputorder=edgesfirst ];');
    console.log('  edge [ color="#00000066" ];');
    console.log('  node [ fillcolor=white; style=filled, fontname="Helvetica Neue LT Pro", shape=box ];');
    for (const edge of minSpanTree) {
      console.log(`  "${edge.src}" -- "${edge.dst}";`)
    }
    console.log('}');
  });
