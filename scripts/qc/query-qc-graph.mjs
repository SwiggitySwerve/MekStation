#!/usr/bin/env node
import {
  loadJourneyArtifacts,
  parseArgs,
  queryGraph,
} from './journey-qc-core.mjs';

const options = parseArgs(process.argv.slice(2));
const { graph } = loadJourneyArtifacts();
const result = queryGraph(graph, options);

if (options.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`# QC graph query`);
  console.log(`Matched nodes: ${result.matchedNodes.length}`);
  for (const node of result.relatedNodes) {
    console.log(`- ${node.id} [${node.kind}] ${node.label}`);
  }
  console.log(`Edges: ${result.relatedEdges.length}`);
  for (const edge of result.relatedEdges) {
    console.log(`- ${edge.from} -${edge.relation}-> ${edge.to}`);
  }
}

process.exit(result.matchedNodes.length > 0 ? 0 : 1);
