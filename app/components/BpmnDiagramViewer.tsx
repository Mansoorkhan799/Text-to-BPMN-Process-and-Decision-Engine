'use client';

import { useEffect, useRef } from 'react';

interface BpmnDiagramViewerProps {
    xml: string;
    width?: number;
    height?: number;
    className?: string;
}

const BpmnDiagramViewer: React.FC<BpmnDiagramViewerProps> = ({ 
    xml, 
    width, 
    height, 
    className = '' 
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    const renderTokenRef = useRef<number>(0);

    useEffect(() => {
        if (!containerRef.current || !xml) return;

        const loadBpmnViewer = async () => {
            // Bump render token to invalidate any in-flight previous async loads
            const myToken = ++renderTokenRef.current;
            try {
                // Clean previous render (avoid duplicate canvases in strict/dev)
                if (viewerRef.current && typeof viewerRef.current.destroy === 'function') {
                    try { viewerRef.current.destroy(); } catch {}
                }
                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                }

                // Dynamically import BPMN.js
                const { default: BpmnJS } = await import('bpmn-js');
                
                // If another effect ran since we started, abort
                if (myToken !== renderTokenRef.current) return;

                // Create viewer
                const viewer = new BpmnJS({
                    container: containerRef.current!
                });
                
                viewerRef.current = viewer;

                // Import the BPMN XML
                await viewer.importXML(xml);
                
                // Fit the diagram to the viewport
                const canvas = viewer.get('canvas') as any;
                if (canvas && typeof canvas.zoom === 'function') {
                    canvas.zoom('fit-viewport');
                }
                
            } catch (error) {
                console.error('Error loading BPMN diagram:', error);
                if (containerRef.current) {
                    containerRef.current.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-size: 14px;">
                            Error loading diagram
                        </div>
                    `;
                }
            }
        };

        loadBpmnViewer();

        // Cleanup
        return () => {
            // Invalidate any in-flight async work
            renderTokenRef.current++;
            if (viewerRef.current && typeof viewerRef.current.destroy === 'function') {
                viewerRef.current.destroy();
            }
        };
    }, [xml, width, height]);

    return (
        <div 
            ref={containerRef} 
            className={`bg-white border rounded ${className}`}
            style={{ width: width ? `${width}px` : undefined, height: height ? `${height}px` : undefined }}
        />
    );
};

export default BpmnDiagramViewer; 