// BPMN to LaTeX conversion utility
// Converts BPMN XML to TikZ LaTeX code with process table

import { XMLParser } from 'fast-xml-parser';

interface BpmnElement {
    id: string;
    name?: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface BpmnFlow {
    id: string;
    sourceRef: string;
    targetRef: string;
    waypoints?: Array<{ x: number; y: number }>;
}

interface BpmnLane {
    id: string;
    name?: string;
    elements: string[];
}

interface ProcessTableRow {
    processName: string;
    task: string;
    procedure: string;
    toolsReferences: string;
    role: string;
}

export function convertBpmnToLatex(bpmnXml: string, fileName: string): string {
    try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            textNodeName: '#text'
        });
        
        const parsed = parser.parse(bpmnXml);
        
        // Extract elements and flows
        const elements: BpmnElement[] = [];
        const flows: BpmnFlow[] = [];
        const lanes: BpmnLane[] = [];
        
        // Parse BPMN elements
        if (parsed['bpmn:definitions']?.['bpmndi:BPMNDiagram']?.['bpmndi:BPMNPlane']) {
            const plane = parsed['bpmn:definitions']['bpmndi:BPMNDiagram']['bpmndi:BPMNPlane'];
            
            // Extract shapes (elements)
            if (plane['bpmndi:BPMNShape']) {
                const shapes = Array.isArray(plane['bpmndi:BPMNShape']) 
                    ? plane['bpmndi:BPMNShape'] 
                    : [plane['bpmndi:BPMNShape']];
                
                shapes.forEach((shape: any) => {
                    if (shape['dc:Bounds']) {
                        const bounds = shape['dc:Bounds'];
                        const element: BpmnElement = {
                            id: shape['@_bpmnElement'],
                            x: parseFloat(bounds['@_x']),
                            y: parseFloat(bounds['@_y']),
                            width: parseFloat(bounds['@_width']),
                            height: parseFloat(bounds['@_height']),
                            type: getElementType(shape['@_bpmnElement']),
                            name: getElementName(parsed, shape['@_bpmnElement'])
                        };
                        elements.push(element);
                    }
                });
            }
            
            // Extract edges (flows)
            if (plane['bpmndi:BPMNEdge']) {
                const edges = Array.isArray(plane['bpmndi:BPMNEdge']) 
                    ? plane['bpmndi:BPMNEdge'] 
                    : [plane['bpmndi:BPMNEdge']];
                
                edges.forEach((edge: any) => {
                    const flow: BpmnFlow = {
                        id: edge['@_bpmnElement'],
                        sourceRef: getFlowSource(parsed, edge['@_bpmnElement']),
                        targetRef: getFlowTarget(parsed, edge['@_bpmnElement']),
                        waypoints: []
                    };
                    
                    // Extract waypoints
                    if (edge['di:waypoint']) {
                        const waypoints = Array.isArray(edge['di:waypoint']) 
                            ? edge['di:waypoint'] 
                            : [edge['di:waypoint']];
                        
                        flow.waypoints = waypoints.map((wp: any) => ({
                            x: parseFloat(wp['@_x']),
                            y: parseFloat(wp['@_y'])
                        }));
                    }
                    
                    flows.push(flow);
                });
            }
        }
        
        // Extract lanes
        if (parsed['bpmn:definitions']?.['bpmn:collaboration']?.['bpmn:participant']) {
            const participants = Array.isArray(parsed['bpmn:definitions']['bpmn:collaboration']['bpmn:participant'])
                ? parsed['bpmn:definitions']['bpmn:collaboration']['bpmn:participant']
                : [parsed['bpmn:definitions']['bpmn:collaboration']['bpmn:participant']];
            
            participants.forEach((participant: any) => {
                if (participant['bpmn:laneSet']?.['bpmn:lane']) {
                    const participantLanes = Array.isArray(participant['bpmn:laneSet']['bpmn:lane'])
                        ? participant['bpmn:laneSet']['bpmn:lane']
                        : [participant['bpmn:laneSet']['bpmn:lane']];
                    
                    participantLanes.forEach((lane: any) => {
                        const laneObj: BpmnLane = {
                            id: lane['@_id'],
                            name: lane['@_name'],
                            elements: lane['bpmn:flowNodeRef'] || []
                        };
                        lanes.push(laneObj);
                    });
                }
            });
        }
        
        // Generate LaTeX code with process table
        return generateLatexCodeWithTable(elements, flows, lanes, fileName);
        
    } catch (error) {
        console.error('Error converting BPMN to LaTeX:', error);
        return generateErrorLatex(fileName);
    }
}

function getElementType(elementId: string): string {
    if (elementId.includes('StartEvent')) return 'startEvent';
    if (elementId.includes('EndEvent')) return 'endEvent';
    if (elementId.includes('Task') || elementId.includes('Activity')) return 'task';
    if (elementId.includes('Gateway')) return 'gateway';
    if (elementId.includes('Participant')) return 'participant';
    if (elementId.includes('Lane')) return 'lane';
    return 'unknown';
}

function getElementName(parsed: any, elementId: string): string {
    // Search for element name in the BPMN process
    if (parsed['bpmn:definitions']?.['bpmn:process']) {
        const process = parsed['bpmn:definitions']['bpmn:process'];
        
        // Check start events
        if (process['bpmn:startEvent']) {
            const startEvents = Array.isArray(process['bpmn:startEvent'])
                ? process['bpmn:startEvent']
                : [process['bpmn:startEvent']];
            
            const startEvent = startEvents.find((event: any) => event['@_id'] === elementId);
            if (startEvent) return startEvent['@_name'] || 'Start';
        }
        
        // Check tasks
        if (process['bpmn:task']) {
            const tasks = Array.isArray(process['bpmn:task'])
                ? process['bpmn:task']
                : [process['bpmn:task']];
            
            const task = tasks.find((t: any) => t['@_id'] === elementId);
            if (task) return task['@_name'] || 'Task';
        }
        
        // Check end events
        if (process['bpmn:endEvent']) {
            const endEvents = Array.isArray(process['bpmn:endEvent'])
                ? process['bpmn:endEvent']
                : [process['bpmn:endEvent']];
            
            const endEvent = endEvents.find((event: any) => event['@_id'] === elementId);
            if (endEvent) return endEvent['@_name'] || 'End';
        }
    }
    
    return 'Element';
}

function getFlowSource(parsed: any, flowId: string): string {
    if (parsed['bpmn:definitions']?.['bpmn:process']?.['bpmn:sequenceFlow']) {
        const flows = Array.isArray(parsed['bpmn:definitions']['bpmn:process']['bpmn:sequenceFlow'])
            ? parsed['bpmn:definitions']['bpmn:process']['bpmn:sequenceFlow']
            : [parsed['bpmn:definitions']['bpmn:process']['bpmn:sequenceFlow']];
        
        const flow = flows.find((f: any) => f['@_id'] === flowId);
        return flow?.['@_sourceRef'] || '';
    }
    return '';
}

function getFlowTarget(parsed: any, flowId: string): string {
    if (parsed['bpmn:definitions']?.['bpmn:process']?.['bpmn:sequenceFlow']) {
        const flows = Array.isArray(parsed['bpmn:definitions']['bpmn:process']['bpmn:sequenceFlow'])
            ? parsed['bpmn:definitions']['bpmn:process']['bpmn:sequenceFlow']
            : [parsed['bpmn:definitions']['bpmn:process']['bpmn:sequenceFlow']];
        
        const flow = flows.find((f: any) => f['@_id'] === flowId);
        return flow?.['@_targetRef'] || '';
    }
    return '';
}

function extractProcessTableData(elements: BpmnElement[], lanes: BpmnLane[]): ProcessTableRow[] {
    const tableData: ProcessTableRow[] = [];
    
    // Get process name from participant or first element
    const processName = getProcessName(elements, lanes);
    
    // Extract tasks and their associated lanes
    elements.forEach(element => {
        if (element.type === 'task' && element.name) {
            // Find which lane this task belongs to
            const lane = lanes.find(l => l.elements.includes(element.id));
            const role = lane?.name || 'Actor';
            
            const row: ProcessTableRow = {
                processName: processName,
                task: element.name,
                procedure: element.name, // For now, same as task
                toolsReferences: '', // For now, blank
                role: role
            };
            
            tableData.push(row);
        }
    });
    
    return tableData;
}

function getProcessName(elements: BpmnElement[], lanes: BpmnLane[]): string {
    // Try to get process name from participant
    const participant = elements.find(e => e.type === 'participant');
    if (participant && participant.name) {
        return participant.name;
    }
    
    // Try to get from lane name
    if (lanes.length > 0 && lanes[0].name) {
        return lanes[0].name;
    }
    
    // Default process name
    return 'Process Name';
}

function generateLatexCodeWithTable(elements: BpmnElement[], flows: BpmnFlow[], lanes: BpmnLane[], fileName: string): string {
    // Calculate bounds for scaling
    const minX = Math.min(...elements.map(e => e.x));
    const maxX = Math.max(...elements.map(e => e.x + e.width));
    const minY = Math.min(...elements.map(e => e.y));
    const maxY = Math.max(...elements.map(e => e.y + e.height));
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Scale factor to fit on page
    const scale = Math.min(12 / width, 8 / height);
    
    // Extract process table data
    const tableData = extractProcessTableData(elements, lanes);
    
    let latex = `\\documentclass{article}
\\usepackage{tikz}
\\usepackage{geometry}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{longtable}
\\usepackage{array}

\\geometry{margin=1in}

\\title{BPMN Process: ${fileName.replace('.bpmn', '').replace('.xml', '')}}
\\author{Generated from BPMN}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Process Table}

\\begin{longtable}{|p{2.5cm}|p{3cm}|p{3cm}|p{3cm}|p{2cm}|}
\\hline
\\textbf{Process Name} & \\textbf{Task} & \\textbf{Procedure} & \\textbf{Tools/References} & \\textbf{Role} \\\\
\\hline
\\endhead
`;

    // Add table rows
    if (tableData.length > 0) {
        tableData.forEach(row => {
            latex += `${row.processName} & ${row.task} & ${row.procedure} & ${row.toolsReferences} & ${row.role} \\\\\\n`;
        });
    } else {
        // Add a default row if no tasks found
        latex += `Process Name & Task & Procedure & Tools/References & Actor \\\\\\n`;
    }
    
    latex += `\\hline
\\end{longtable}

\\section{BPMN Diagram}

\\begin{center}
\\begin{tikzpicture}[
    scale=${scale.toFixed(2)},
    transform shape,
    every node/.style={font=\\small}
]

% Define BPMN shapes
\\tikzstyle{startEvent} = [circle, draw=black, fill=green!20, minimum size=1cm]
\\tikzstyle{endEvent} = [circle, draw=black, fill=red!20, minimum size=1cm]
\\tikzstyle{task} = [rectangle, draw=black, fill=blue!20, minimum width=2cm, minimum height=1cm, rounded corners=2pt]
\\tikzstyle{gateway} = [diamond, draw=black, fill=yellow!20, minimum size=1.5cm]
\\tikzstyle{flow} = [->, thick, black]

% Draw lanes
`;

    // Draw lanes first (background)
    lanes.forEach((lane, index) => {
        const laneElements = elements.filter(e => lane.elements.includes(e.id));
        if (laneElements.length > 0) {
            const minX = Math.min(...laneElements.map(e => e.x));
            const maxX = Math.max(...laneElements.map(e => e.x + e.width));
            const minY = Math.min(...laneElements.map(e => e.y));
            const maxY = Math.max(...laneElements.map(e => e.y + e.height));
            
            latex += `% Lane: ${lane.name || lane.id}
\\draw[fill=gray!10, draw=gray!50, thick] (${minX}, ${minY}) rectangle (${maxX}, ${maxY});
\\node[anchor=north west] at (${minX}, ${maxY}) {\\textbf{${lane.name || lane.id}}};

`;
        }
    });
    
    // Draw elements
    elements.forEach(element => {
        const x = element.x + element.width / 2;
        const y = element.y + element.height / 2;
        
        switch (element.type) {
            case 'startEvent':
                latex += `\\node[startEvent] (${element.id}) at (${x}, ${y}) {};
\\node[anchor=north] at (${x}, ${y - 0.5}) {\\tiny ${element.name || 'Start'}};
`;
                break;
            case 'endEvent':
                latex += `\\node[endEvent] (${element.id}) at (${x}, ${y}) {};
\\node[anchor=north] at (${x}, ${y - 0.5}) {\\tiny ${element.name || 'End'}};
`;
                break;
            case 'task':
                latex += `\\node[task] (${element.id}) at (${x}, ${y}) {${element.name || 'Task'}};
`;
                break;
            case 'gateway':
                latex += `\\node[gateway] (${element.id}) at (${x}, ${y}) {};
\\node[anchor=north] at (${x}, ${y - 0.8}) {\\tiny ${element.name || 'Gateway'}};
`;
                break;
        }
    });
    
    // Draw flows
    flows.forEach(flow => {
        const sourceElement = elements.find(e => e.id === flow.sourceRef);
        const targetElement = elements.find(e => e.id === flow.targetRef);
        
        if (sourceElement && targetElement) {
            const sourceX = sourceElement.x + sourceElement.width / 2;
            const sourceY = sourceElement.y + sourceElement.height / 2;
            const targetX = targetElement.x + targetElement.width / 2;
            const targetY = targetElement.y + targetElement.height / 2;
            
            if (flow.waypoints && flow.waypoints.length > 0) {
                // Use waypoints for curved path
                let path = `(${sourceX}, ${sourceY})`;
                flow.waypoints.forEach(wp => {
                    path += ` -- (${wp.x}, ${wp.y})`;
                });
                path += ` -- (${targetX}, ${targetY})`;
                latex += `\\draw[flow] ${path};
`;
            } else {
                // Straight line
                latex += `\\draw[flow] (${sourceX}, ${sourceY}) -- (${targetX}, ${targetY});
`;
            }
        }
    });
    
    latex += `
\\end{tikzpicture}
\\end{center}

\\section{Process Description}

This diagram represents the BPMN process with the following elements:

\\begin{itemize}
`;

    // Add element descriptions
    elements.forEach(element => {
        if (element.name && element.name !== 'Start' && element.name !== 'End') {
            latex += `\\item \\textbf{${element.name}}: ${getElementDescription(element.type)}
`;
        }
    });
    
    latex += `\\end{itemize}

\\end{document}`;
    
    return latex;
}

function getElementDescription(type: string): string {
    switch (type) {
        case 'startEvent': return 'Start event of the process';
        case 'endEvent': return 'End event of the process';
        case 'task': return 'Task or activity in the process';
        case 'gateway': return 'Decision point or gateway in the process';
        default: return 'Process element';
    }
}

function generateErrorLatex(fileName: string): string {
    return `\\documentclass{article}
\\usepackage{tikz}
\\usepackage{geometry}

\\geometry{margin=1in}

\\title{BPMN Diagram: ${fileName.replace('.bpmn', '').replace('.xml', '')}}
\\author{Generated from BPMN}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Error in BPMN Conversion}

\\begin{center}
\\begin{tikzpicture}
\\node[rectangle, draw=red, fill=red!10, minimum width=4cm, minimum height=2cm] at (0,0) {
    \\textbf{Error: Could not parse BPMN diagram}
};
\\end{tikzpicture}
\\end{center}

\\paragraph{Note:} The BPMN diagram could not be converted to LaTeX. Please check that the BPMN file is valid and contains proper elements.

\\end{document}`;
} 