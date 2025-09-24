/**
 * Example usage of the GEXF parser with the sample migration data
 * 
 * This file demonstrates how to load and use the GEXF data in your Kriskogram implementation.
 */

import { loadGexfFromUrl, parseGexf, gexfToKriskogramSnapshots, createSampleKriskogramData } from '../lib/gexf-parser';

// Example 1: Load GEXF data from file
export async function loadMigrationData() {
  try {
    // Load the sample GEXF file we created
    const gexfGraph = await loadGexfFromUrl('/src/data/sample-migration-data.gexf');
    
    // Convert to Kriskogram snapshots for animation
    const snapshots = gexfToKriskogramSnapshots(gexfGraph);
    
    console.log('Loaded GEXF data:', {
      timeRange: gexfGraph.timeRange,
      totalSnapshots: snapshots.length,
      nodesInFirstSnapshot: snapshots[0]?.nodes.length,
      edgesInFirstSnapshot: snapshots[0]?.edges.length,
    });
    
    return snapshots;
  } catch (error) {
    console.error('Failed to load GEXF data:', error);
    return null;
  }
}

// Example 2: Use sample data for quick testing
export function getSampleData() {
  const sampleData = createSampleKriskogramData();
  
  console.log('Sample data:', {
    nodes: sampleData.nodes.length,
    edges: sampleData.edges.length,
    nodeIds: sampleData.nodes.map(n => n.id),
    edgeValues: sampleData.edges.map(e => e.value),
  });
  
  return sampleData;
}

// Example 3: Parse GEXF XML string directly
export function parseGexfString(gexfXml: string) {
  try {
    const gexfGraph = parseGexf(gexfXml);
    return gexfGraph;
  } catch (error) {
    console.error('Failed to parse GEXF string:', error);
    return null;
  }
}

// Example 4: Create a simple Kriskogram configuration
export function createKriskogramConfig(snapshot: any) {
  return {
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    accessors: {
      // Order nodes by economic index (descending)
      nodeOrder: (d: any) => -(d.economic_index || 0),
      
      // Color nodes by economic index
      nodeColor: (d: any) => {
        const index = d.economic_index || 0;
        const hue = index * 120; // Green to red scale
        return `hsl(${hue}, 70%, 50%)`;
      },
      
      // Size nodes by population
      nodeRadius: (d: any) => {
        const population = d.population || 1000000;
        return Math.sqrt(population) / 1000;
      },
      
      // Width edges by migration value
      edgeWidth: (e: any) => Math.sqrt(e.value) / 10,
      
      // Color edges by migration type
      edgeColor: (e: any, isAbove: boolean) => {
        const colors = {
          economic: isAbove ? '#1f77b4' : '#d62728',
          career: isAbove ? '#2ca02c' : '#ff7f0e',
          lifestyle: isAbove ? '#9467bd' : '#8c564b',
        };
        return colors[e.migration_type as keyof typeof colors] || (isAbove ? '#1f77b4' : '#d62728');
      },
    },
    width: 1000,
    height: 600,
    margin: { top: 40, right: 40, bottom: 40, left: 40 },
  };
}

// Example 5: Animation helper
export function createAnimationData(snapshots: any[], duration = 5000) {
  return {
    snapshots,
    duration,
    frameRate: 60,
    getSnapshotAtTime: (time: number) => {
      const progress = Math.min(time / duration, 1);
      const index = Math.floor(progress * (snapshots.length - 1));
      return snapshots[index];
    },
  };
}

// Example usage in a React component:
/*
import React, { useEffect, useState } from 'react';
import { loadMigrationData, createKriskogramConfig } from './data/example-usage';
import { createKriskogram } from './lib/kriskogram';

export function MigrationKriskogram() {
  const [snapshots, setSnapshots] = useState([]);
  const [currentSnapshot, setCurrentSnapshot] = useState(null);
  
  useEffect(() => {
    loadMigrationData().then(setSnapshots);
  }, []);
  
  useEffect(() => {
    if (snapshots.length > 0 && !currentSnapshot) {
      setCurrentSnapshot(snapshots[0]);
    }
  }, [snapshots, currentSnapshot]);
  
  useEffect(() => {
    if (currentSnapshot) {
      const config = createKriskogramConfig(currentSnapshot);
      createKriskogram(config);
    }
  }, [currentSnapshot]);
  
  return <div id="kriskogram-container" />;
}
*/
