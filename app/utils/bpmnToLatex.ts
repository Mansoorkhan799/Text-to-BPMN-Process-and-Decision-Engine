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
    stepSeq: string;
    processName: string;
    task: string;
    procedure: string;
    toolsReferences: string;
    role: string;
}

interface ProcessMetadata {
    processName: string;
    description: string;
    processOwner: string;
    processManager: string;
}

interface AdvancedDetails {
    versionNo: string;
    processStatus: string;
    classification: string;
    dateOfCreation: string;
    dateOfReview: string;
    effectiveDate: string;
    modificationDate: string;
    modifiedBy: string;
    changeDescription: string;
    createdBy: string;
}

interface TableOptions {
    processTable: boolean;
    processDetailsTable: boolean;
    signOffTable: boolean;
    historyTable: boolean;
    triggerTable: boolean;
}

interface SignOffData {
    responsibility: string;
    date: string;
    name: string;
    designation: string;
    signature: string;
}

interface HistoryData {
    versionNo: string;
    date: string;
    statusRemarks: string;
    author: string;
}

interface TriggerData {
    triggers: string;
    inputs: string;
    outputs: string;
}

export function convertBpmnToLatex(
    bpmnXml: string, 
    fileName: string, 
    processMetadata?: ProcessMetadata,
    tableOptions?: TableOptions,
    signOffData?: SignOffData,
    historyData?: HistoryData,
    triggerData?: TriggerData,
    advancedDetails?: AdvancedDetails
): string {
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
        
        // Extract lanes from participants (if present)
        if (parsed['bpmn:definitions']?.['bpmn:collaboration']?.['bpmn:participant']) {
            const participants = Array.isArray(parsed['bpmn:definitions']['bpmn:collaboration']['bpmn:participant'])
                ? parsed['bpmn:definitions']['bpmn:collaboration']['bpmn:participant']
                : [parsed['bpmn:definitions']['bpmn:collaboration']['bpmn:participant']];
            
            participants.forEach((participant: any) => {
                // Add participant as a process element
                const participantElement: BpmnElement = {
                    id: participant['@_id'],
                    name: participant['@_name'],
                    type: 'participant',
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0
                };
                elements.push(participantElement);
                
                // Extract lanes from this participant
                if (participant['bpmn:laneSet']?.['bpmn:lane']) {
                    const participantLanes = Array.isArray(participant['bpmn:laneSet']['bpmn:lane'])
                        ? participant['bpmn:laneSet']['bpmn:lane']
                        : [participant['bpmn:laneSet']['bpmn:lane']];
                    
                    participantLanes.forEach((lane: any) => {
                        // Handle flowNodeRef - it can be a string or array
                        let flowNodeRefs: string[] = [];
                        if (lane['bpmn:flowNodeRef']) {
                            if (Array.isArray(lane['bpmn:flowNodeRef'])) {
                                flowNodeRefs = lane['bpmn:flowNodeRef'];
                            } else {
                                flowNodeRefs = [lane['bpmn:flowNodeRef']];
                            }
                        }
                        
                        const laneObj: BpmnLane = {
                            id: lane['@_id'],
                            name: lane['@_name'],
                            elements: flowNodeRefs
                        };
                        lanes.push(laneObj);
                    });
                }
            });
        }
        
        // Extract lanes directly from process (for diagrams like your XML)
        if (parsed['bpmn:definitions']?.['bpmn:process']?.['bpmn:laneSet']?.['bpmn:lane']) {
            const processLanes = Array.isArray(parsed['bpmn:definitions']['bpmn:process']['bpmn:laneSet']['bpmn:lane'])
                ? parsed['bpmn:definitions']['bpmn:process']['bpmn:laneSet']['bpmn:lane']
                : [parsed['bpmn:definitions']['bpmn:process']['bpmn:laneSet']['bpmn:lane']];
            processLanes.forEach((lane: any) => {
                let flowNodeRefs: string[] = [];
                if (lane['bpmn:flowNodeRef']) {
                    if (Array.isArray(lane['bpmn:flowNodeRef'])) {
                        flowNodeRefs = lane['bpmn:flowNodeRef'];
                    } else {
                        flowNodeRefs = [lane['bpmn:flowNodeRef']];
                    }
                }
                const laneObj: BpmnLane = {
                    id: lane['@_id'],
                    name: lane['@_name'],
                    elements: flowNodeRefs
                };
                lanes.push(laneObj);
            });
        }
        
        // Generate LaTeX code with table options
        return generateLatexCodeWithTable(elements, flows, lanes, fileName, processMetadata, tableOptions, signOffData, historyData, triggerData, advancedDetails);
        
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
    // First check if it's a participant in collaboration
    if (parsed['bpmn:definitions']?.['bpmn:collaboration']?.['bpmn:participant']) {
        const participants = Array.isArray(parsed['bpmn:definitions']['bpmn:collaboration']['bpmn:participant'])
            ? parsed['bpmn:definitions']['bpmn:collaboration']['bpmn:participant']
            : [parsed['bpmn:definitions']['bpmn:collaboration']['bpmn:participant']];
        
        const participant = participants.find((p: any) => p['@_id'] === elementId);
        if (participant) return participant['@_name'] || 'Participant';
    }
    
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

// Helper to sort lanes by their vertical position (y coordinate)
function sortLanesByY(lanes: BpmnLane[], elements: BpmnElement[]): BpmnLane[] {
    // Find the corresponding element for each lane to get its y position
    return lanes.slice().sort((a, b) => {
        const aElem = elements.find(e => e.id === a.id);
        const bElem = elements.find(e => e.id === b.id);
        const aY = aElem ? aElem.y : 0;
        const bY = bElem ? bElem.y : 0;
        return aY - bY;
    });
}

function extractProcessTableData(elements: BpmnElement[], lanes: BpmnLane[]): ProcessTableRow[] {
    const tableData: ProcessTableRow[] = [];
    // Sort lanes by vertical position (top to bottom)
    const sortedLanes = sortLanesByY(lanes, elements);
    // Group tasks by lane
    sortedLanes.forEach((lane, laneIdx) => {
        // Ensure lane.elements is always an array of strings
        let laneElements: string[] = [];
        if (Array.isArray(lane.elements)) {
            laneElements = lane.elements;
        } else if (typeof lane.elements === 'string') {
            laneElements = [lane.elements];
        }
        // Find all tasks in this lane
        const laneTasks = elements.filter(e => e.type === 'task' && laneElements.includes(e.id));
        // Step sequence prefix for this lane
        const stepPrefix = `${laneIdx + 1}`;
        laneTasks.forEach((task, taskIdx) => {
            tableData.push({
                stepSeq: `${stepPrefix}.${taskIdx + 1}`,
                processName: getProcessName(elements, lanes),
                task: task.name || '',
                procedure: task.name || '',
                toolsReferences: '',
                role: (typeof lane.name === 'string' && lane.name.trim() !== '') ? lane.name : 'Actor',
            });
        });
    });
    return tableData;
}

function getProcessName(elements: BpmnElement[], lanes: BpmnLane[]): string {
    // Try to get process name from participant
    const participant = elements.find(e => e.type === 'participant');
    if (participant && participant.name) {
        return participant.name;
    }
    
    // Try to get from first lane name (as fallback)
    if (lanes.length > 0 && lanes[0].name) {
        return lanes[0].name;
    }
    
    // Default process name
    return 'Process Name';
}

function generateLatexCodeWithTable(
    elements: BpmnElement[], 
    flows: BpmnFlow[], 
    lanes: BpmnLane[], 
    fileName: string, 
    processMetadata?: ProcessMetadata,
    tableOptions?: TableOptions,
    signOffData?: SignOffData,
    historyData?: HistoryData,
    triggerData?: TriggerData,
    advancedDetails?: AdvancedDetails
): string {
    // Extract process table data
    const tableData = extractProcessTableData(elements, lanes);
    // Get the process name for the section heading
    const processName = getProcessName(elements, lanes);
    
    // Use process metadata if available, otherwise use defaults
    const metadata = processMetadata || {
        processName: processName,
        description: 'No description available',
        processOwner: 'Not specified',
        processManager: 'Not specified'
    };
    
    // Default table options if not provided
    const options = tableOptions || {
        processTable: true,
        processDetailsTable: true,
        signOffTable: false,
        historyTable: false,
        triggerTable: false
    };
    
    let latex = `\\documentclass{article}
\\usepackage{geometry}
\\usepackage{array}

\\geometry{margin=1in}

\\title{BPMN Process: ${fileName.replace('.bpmn', '').replace('.xml', '')}}
\\author{Generated from BPMN}
\\date{\\today}

\\begin{document}

\\maketitle
`;

    // Generate Process Table if selected
    if (options.processTable) {
        latex += `
\\section{${processName} Table}

\\begin{tabular}{|c|c|c|c|c|c|}
\\hline
\\textbf{Step} & \\textbf{Process} & \\textbf{Task} & \\textbf{Procedure} & \\textbf{Tools/Refs} & \\textbf{Role} \\\\
\\hline
`;
        tableData.forEach((row) => {
            latex += `${row.stepSeq} & ${row.processName} & ${row.task} & ${row.procedure} & ${row.toolsReferences || '--'} & ${row.role} \\\\
\\hline
`;
        });
        latex += `\\end{tabular}
`;
    }

    // Generate Process Details Table if selected
    if (options.processDetailsTable) {
        latex += `
\\section{Process Details}

\\begin{tabular}{|l|l|}
\\hline
\\textbf{Process Name} & ${metadata.processName || 'Not specified'} \\\\
\\hline
\\textbf{Description} & ${metadata.description || 'No description available'} \\\\
\\hline
\\textbf{Process Owner} & ${metadata.processOwner || 'Not specified'} \\\\
\\hline
\\textbf{Process Manager} & ${metadata.processManager || 'Not specified'} \\\\
\\hline
\\textbf{Version No} & ${advancedDetails?.versionNo || 'Not specified'} \\\\
\\hline
\\textbf{Classification} & ${advancedDetails?.classification || 'Not specified'} \\\\
\\hline
\\textbf{Process Status} & ${advancedDetails?.processStatus || 'Not specified'} \\\\
\\hline
\\textbf{Effective Date} & ${advancedDetails?.effectiveDate || 'Not specified'} \\\\
\\hline
\\textbf{Review Date} & ${advancedDetails?.dateOfReview || 'Not specified'} \\\\
\\hline
\\end{tabular}
`;
    }

    // Generate Sign OFF Table if selected
    if (options.signOffTable && signOffData) {
        latex += `
\\section{Sign OFF Table}

\\begin{tabular}{|c|c|c|c|c|}
\\hline
\\textbf{Responsibility} & \\textbf{Date} & \\textbf{Name} & \\textbf{Designation} & \\textbf{Signature} \\\\
\\hline
${signOffData.responsibility || '--'} & ${signOffData.date || '--'} & ${signOffData.name || '--'} & ${signOffData.designation || '--'} & ${signOffData.signature || '--'} \\\\
\\hline
\\end{tabular}
`;
    }

    // Generate History Table if selected
    if (options.historyTable && historyData) {
        latex += `
\\section{History Table}

\\begin{tabular}{|c|c|c|c|}
\\hline
\\textbf{Version No} & \\textbf{Date} & \\textbf{Status/Remarks} & \\textbf{Author} \\\\
\\hline
${historyData.versionNo || '--'} & ${historyData.date || '--'} & ${historyData.statusRemarks || '--'} & ${historyData.author || '--'} \\\\
\\hline
\\end{tabular}
`;
    }

    // Generate Trigger Table if selected
    if (options.triggerTable && triggerData) {
        latex += `
\\section{Trigger Table}

\\begin{tabular}{|c|c|c|}
\\hline
\\textbf{Triggers} & \\textbf{Inputs} & \\textbf{Outputs} \\\\
\\hline
${triggerData.triggers || '--'} & ${triggerData.inputs || '--'} & ${triggerData.outputs || '--'} \\\\
\\hline
\\end{tabular}
`;
    }

    latex += `
\\end{document}`;
    return latex;
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