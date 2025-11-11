import type React from 'react';
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import type * as d3 from 'd3';
import { createKriskogram } from '../lib/kriskogram';
import type { KriskogramConfig, Node, Edge } from '../lib/kriskogram';

export interface KriskogramProps {
  nodes: Node[];
  edges: Edge[];
  accessors?: KriskogramConfig['accessors'];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  arcOpacity?: number;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  lens?: { enabled: boolean; x: number; y: number; radius: number };
  onMouseMoveInCanvas?: (pt: { x: number; y: number }) => void;
  onWheelInCanvas?: (deltaY: number) => void;
  legend?: KriskogramConfig['legend'];
  labelScale?: number;
}

export interface KriskogramRef {
  updateData: (nodes: Node[], edges: Edge[]) => void;
  getSVG: () => d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown> | null;
}

export const Kriskogram = forwardRef<KriskogramRef, KriskogramProps>(
  ({ nodes, edges, accessors, width = 800, height = 400, margin, arcOpacity = 0.85, title, className, style, lens, onMouseMoveInCanvas, onWheelInCanvas, legend, labelScale }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const kriskogramRef = useRef<ReturnType<typeof createKriskogram> | null>(null);

    useImperativeHandle(ref, () => ({
      updateData: (newNodes: Node[], newEdges: Edge[]) => {
        if (kriskogramRef.current) {
          kriskogramRef.current.updateData(newNodes, newEdges);
        }
      },
      getSVG: () => {
        return kriskogramRef.current?.svg || null;
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      // Clear any existing content
      containerRef.current.innerHTML = '';

      // Create the kriskogram
      const kriskogram = createKriskogram({
        nodes,
        edges,
        accessors,
        width,
        height,
        margin,
        arcOpacity,
        title,
        container: containerRef.current ?? undefined,
        lens,
        legend,
        labelScale,
      });

      kriskogramRef.current = kriskogram;

      // Cleanup function
      return () => {
        // Remove any tooltips when component unmounts
        if (typeof document !== 'undefined') {
          const tooltips = document.querySelectorAll('.kriskogram-tooltip');
          for (const tooltip of tooltips) {
            tooltip.remove();
          }
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
        kriskogramRef.current = null;
      };
    }, [accessors, arcOpacity, edges, height, labelScale, lens, legend, margin, nodes, title, width]);

    // Update data when props change
    useEffect(() => {
      if (kriskogramRef.current && nodes.length > 0 && edges.length > 0) {
        kriskogramRef.current.updateData(nodes, edges);
      }
    }, [nodes, edges]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          ...style,
        }}
        onMouseMove={(e) => {
          if (!containerRef.current || !onMouseMoveInCanvas) return;
          const rect = containerRef.current.getBoundingClientRect();
          onMouseMoveInCanvas({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onWheel={(e) => {
          if (onWheelInCanvas) onWheelInCanvas(e.deltaY);
        }}
      />
    );
  }
);

Kriskogram.displayName = 'Kriskogram';

export default Kriskogram;
