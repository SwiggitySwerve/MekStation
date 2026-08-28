#!/usr/bin/env node
import {
  loadJourneyArtifacts,
  parseArgs,
  queryGraph,
  resolveSubsystemJourneyNodeIds,
} from './journey-qc-core.mjs';

const options = parseArgs(process.argv.slice(2));
const { catalog, graph } = loadJourneyArtifacts();
// --subsystem resolves journeys by the catalog facet, then returns their
// existing graph joins; an unknown tag throws naming the six allowed values.
const result = options.subsystem
  ? queryGraph(graph, {
      ...options,
      matchIds: resolveSubsystemJourneyNodeIds(catalog, options.subsystem),
    })
  : queryGraph(graph, options);

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
