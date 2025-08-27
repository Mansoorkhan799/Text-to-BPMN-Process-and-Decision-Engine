import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/utils/jwt';
import User from '@/models/User';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Token counting function (rough estimation) - kept for monitoring only
function countTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

// Clean and prepare text for LLM
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .trim()
    .substring(0, 8000); // Increased limit for longer documents
}

// Enhanced intelligent intent detection to classify user requests with high accuracy
function detectIntent(prompt: string, documentText?: string): 'bpmn_generation' | 'latex_generation' | 'bpmn_question' | 'general' {
  const fullText = (prompt + ' ' + (documentText || '')).toLowerCase().trim();
  
  // Enhanced BPMN generation indicators with more comprehensive patterns
  const bpmnGenerationKeywords = [
    // Direct BPMN/Diagram requests
    'create diagram', 'generate diagram', 'draw diagram', 'make diagram', 'build diagram', 'design diagram',
    'create bpmn', 'generate bpmn', 'draw bpmn', 'make bpmn', 'build bpmn', 'design bpmn',
    'create process', 'generate process', 'draw process', 'model process', 'design process', 'build process',
    'create workflow', 'generate workflow', 'draw workflow', 'model workflow', 'design workflow', 'build workflow',
    'visualize process', 'map process', 'chart process', 'diagram process', 'illustrate process',
    
    // Single word triggers that should catch simple requests
    'diagram for', 'process for', 'workflow for', 'flowchart for',
    'make workflow', 'make process', 'show workflow', 'show process',
    
    // Process modeling and business terms
    'business process model', 'process flow', 'workflow diagram', 'process diagram', 'process mapping',
    'activity diagram', 'swimlane diagram', 'flowchart', 'process map', 'process flowchart',
    'business workflow', 'organizational process', 'operational workflow', 'process analysis',
    
    // Action verbs with process context
    'model the', 'diagram the', 'visualize the', 'map the', 'chart the', 'illustrate the',
    'show me a diagram', 'show me a process', 'show me a workflow', 'show me the flow',
    'draw me a', 'create me a', 'generate me a', 'make me a',
    
    // Process description patterns
    'process starts with', 'process begins with', 'first step is', 'workflow starts', 'flow begins',
    'employee does', 'manager approves', 'system processes', 'user submits', 'customer requests',
    'process involves', 'steps are', 'activities include', 'tasks involve', 'workflow includes',
    'approval process', 'review process', 'decision process', 'workflow process',
    
    // Common business process terms
    'invoice approval', 'order fulfillment', 'customer onboarding', 'hiring process',
    'approval workflow', 'review workflow', 'onboarding workflow', 'fulfillment workflow',
    'how the approval', 'how the process', 'how the workflow', 'how does the process',
    
    // Sequential and procedural language
    'step by step', 'procedure for', 'process for', 'workflow for', 'how to process',
    'sequence of', 'flow of', 'order of', 'progression of', 'series of steps'
  ];
  
  // Enhanced LaTeX generation indicators
  const latexGenerationKeywords = [
    // Direct document/report requests
    'create document', 'generate document', 'write document', 'make document', 'build document',
    'create report', 'generate report', 'write report', 'make report', 'build report',
    'create latex', 'generate latex', 'write latex', 'make latex', 'build latex',
    'create paper', 'generate paper', 'write paper', 'academic paper', 'research paper',
    
    // Document types and formats
    'technical document', 'business report', 'analysis report', 'research report',
    'documentation', 'manual', 'specification', 'proposal', 'thesis', 'dissertation',
    'white paper', 'case study', 'technical specification', 'user manual',
    'project report', 'executive summary', 'technical paper', 'conference paper',
    
    // LaTeX and formatting specific
    'latex code', 'latex document', 'tex file', 'compile latex', 'latex template',
    'bibliography', 'citations', 'references', 'table of contents', 'appendix',
    'abstract', 'introduction', 'methodology', 'results', 'conclusion',
    'formatting', 'typesetting', 'academic formatting', 'professional document'
  ];
  
  // Enhanced question/consultation indicators
  const questionKeywords = [
    // Question words and patterns
    'what is', 'what are', 'what does', 'what can', 'what should', 'what would',
    'how do', 'how does', 'how can', 'how should', 'how would', 'how to',
    'why do', 'why does', 'why should', 'why would', 'why is', 'why are',
    'when do', 'when should', 'when would', 'when is', 'when are',
    'where do', 'where should', 'where would', 'where is', 'where are',
    'which is', 'which are', 'which should', 'which would', 'which can',
    'who does', 'who should', 'who would', 'who can', 'who is',
    
    // Help and explanation requests
    'help me', 'explain', 'tell me', 'advice', 'guidance', 'recommend',
    'best practice', 'best practices', 'explain how', 'tell me about',
    'what about', 'thoughts on', 'opinion on', 'advice on',
    
    // Consultation and advisory patterns
    'can you explain', 'can you help', 'can you advise', 'can you recommend',
    'what do you think', 'what would you suggest', 'what would you recommend',
    'could you explain', 'could you help', 'would you recommend', 'should i',
    'is it better', 'which approach', 'which method', 'which way'
  ];
  
  // Enhanced general conversation indicators
  const generalKeywords = [
    // Greetings and social
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
    'greetings', 'howdy', 'salutations',
    
    // General chat and responses
    'thank you', 'thanks', 'appreciate', 'great', 'awesome', 'perfect',
    'okay', 'ok', 'yes', 'no', 'maybe', 'sure', 'fine', 'alright',
    'sounds good', 'looks good', 'nice', 'cool', 'excellent',
    
    // Meta and system requests
    'about you', 'who are you', 'what can you do', 'your capabilities',
    'help', 'support', 'assistance', 'information about'
  ];
  
  // Initialize scoring with weights
  let bpmnScore = 0;
  let latexScore = 0;
  let questionScore = 0;
  let generalScore = 0;
  
  // Enhanced keyword matching with weighted scoring
  bpmnGenerationKeywords.forEach(keyword => {
    if (fullText.includes(keyword)) {
      const weight = keyword.split(' ').length; // Multi-word phrases get higher weight
      bpmnScore += weight * 2; // Boost BPMN detection
    }
  });
  
  latexGenerationKeywords.forEach(keyword => {
    if (fullText.includes(keyword)) {
      const weight = keyword.split(' ').length;
      latexScore += weight * 2; // Boost LaTeX detection
    }
  });
  
  questionKeywords.forEach(keyword => {
    if (fullText.includes(keyword)) {
      questionScore += 1.5; // Slightly boost questions
    }
  });
  
  generalKeywords.forEach(keyword => {
    if (fullText.includes(keyword)) {
      generalScore += 1;
    }
  });
  
  // Advanced pattern recognition and contextual analysis
  
  // Sequential/procedural language patterns (strong BPMN indicators)
  const sequencePatterns = [
    /step \d+/, /first.*then/, /after.*next/, /when.*then/, /if.*then/,
    /employee.*manager/, /user.*system/, /customer.*staff/, /request.*approval/,
    /\b(starts?|begins?|initiates?)\b.*\b(process|workflow|procedure)\b/,
    /\b(approval|review|decision)\b.*\b(process|workflow|flow)\b/,
    /\b(customer|user|employee)\b.*\b(submits?|requests?|initiates?)\b/,
    /\b(manager|supervisor|admin)\b.*\b(approves?|reviews?|processes?)\b/
  ];
  
  sequencePatterns.forEach(pattern => {
    if (pattern.test(fullText)) {
      bpmnScore += 3; // Strong indicator for BPMN
    }
  });
  
  // Document structure patterns (strong LaTeX indicators)
  const documentPatterns = [
    /\b(chapter|section|subsection|paragraph)\b/,
    /\b(table of contents|bibliography|references|citations)\b/,
    /\b(abstract|introduction|methodology|conclusion)\b/,
    /\b(figure|table|appendix|index)\b/,
    /\b(academic|research|technical|formal)\b.*\b(paper|document|report)\b/
  ];
  
  documentPatterns.forEach(pattern => {
    if (pattern.test(fullText)) {
      latexScore += 3; // Strong indicator for LaTeX
    }
  });
  
  // Question starters (strong question indicators)
  const questionStarters = [
    'what', 'how', 'why', 'when', 'where', 'which', 'who',
    'can you', 'could you', 'would you', 'should i', 'is it',
    'do you', 'does it', 'will it', 'can i', 'may i'
  ];
  
  if (questionStarters.some(starter => fullText.startsWith(starter))) {
    questionScore += 4; // Strong question indicator
  }
  
  // Context-based scoring adjustments
  
  // If describing a business scenario or organizational workflow
  const businessContexts = ['company', 'organization', 'business', 'department', 'team', 'office'];
  if (businessContexts.some(context => fullText.includes(context))) {
    bpmnScore += 2;
  }
  
  // If mentioning academic or research context
  const academicContexts = ['university', 'research', 'academic', 'study', 'analysis', 'publication'];
  if (academicContexts.some(context => fullText.includes(context))) {
    latexScore += 2;
  }
  
  // Length and structure analysis
  if (fullText.length < 15 && generalScore > 0) {
    generalScore += 3; // Very short conversational messages
  }
  
  // If text contains multiple sentences describing sequential actions
  const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length >= 3) {
    const actionWords = ['then', 'next', 'after', 'subsequently', 'following', 'finally'];
    const actionCount = actionWords.reduce((count, word) => 
      count + (fullText.match(new RegExp(word, 'g')) || []).length, 0);
    
    if (actionCount >= 2) {
      bpmnScore += 4; // Strong sequential narrative indicates process
    }
  }
  
  // Special case: If explicitly mentions both process AND document
  if (fullText.includes('process') && fullText.includes('document')) {
    // Could be either - look for more specific indicators
    if (fullText.includes('model') || fullText.includes('diagram') || fullText.includes('flow')) {
      bpmnScore += 2;
    } else if (fullText.includes('write') || fullText.includes('format') || fullText.includes('report')) {
      latexScore += 2;
    }
  }
  
  // Final scoring and decision
  const maxScore = Math.max(bpmnScore, latexScore, questionScore, generalScore);
  
  // Debug logging can be enabled for development
  // console.log('Intent Detection Scores:', { 
  //   bpmnScore, 
  //   latexScore, 
  //   questionScore, 
  //   generalScore, 
  //   maxScore,
  //   prompt: prompt.substring(0, 100) + '...'
  // });
  
  // Enhanced decision logic with tie-breaking
  if (maxScore === 0) {
    return 'general'; // No clear indicators
  }
  
  // Apply different thresholds based on intent type
  const BPMN_MIN_THRESHOLD = 2; // Lower threshold for BPMN since it's a primary feature
  const LATEX_MIN_THRESHOLD = 3; 
  const QUESTION_MIN_THRESHOLD = 2; // Lower threshold for questions
  
  if (bpmnScore === maxScore && bpmnScore >= BPMN_MIN_THRESHOLD) {
    return 'bpmn_generation';
  } else if (latexScore === maxScore && latexScore >= LATEX_MIN_THRESHOLD) {
    return 'latex_generation';
  } else if (questionScore === maxScore && questionScore >= QUESTION_MIN_THRESHOLD) {
    return 'bpmn_question';
  } else {
    // If scores are low or tied, but we have some BPMN indicators, default to BPMN
    // This handles cases like "create process" which should clearly be BPMN
    if (bpmnScore > 0 && bpmnScore >= latexScore && bpmnScore >= questionScore) {
      return 'bpmn_generation';
    }
    // Otherwise default to general for safety
    return 'general';
  }
}

// Validate BPMN XML structure for perfect bpmn.io compatibility
function validateBPMNXML(xml: string): boolean {
  const requiredElements = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<bpmn:definitions',
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"',
    'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"',
    'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"',
    'xmlns:di="http://www.omg.org/spec/DD/20100524/DI"',
    'id="Definitions_1"',
    'targetNamespace="http://bpmn.io/schema/bpmn"',
    '<bpmn:collaboration',
    '<bpmn:participant',
    '<bpmn:process',
    'isExecutable="false"',
    '<bpmn:laneSet',
    '<bpmn:lane',
    '<bpmn:flowNodeRef',
    '<bpmndi:BPMNDiagram',
    '<bpmndi:BPMNPlane',
    'bpmnElement="Collaboration_1"',
    '<bpmndi:BPMNShape',
    '<dc:Bounds',
    '<bpmndi:BPMNLabel'
  ];
  
  const hasAllElements = requiredElements.every(element => xml.includes(element));
  
  // Check for proper visual layout requirements
  const hasParticipantShape = xml.includes('_di') && xml.includes('bpmnElement="Participant_');
  const hasProperTaskDimensions = xml.includes('width="100" height="80"') || xml.includes('width="100"') && xml.includes('height="80"');
  const hasProperEventDimensions = xml.includes('width="36" height="36"') || xml.includes('width="36"') && xml.includes('height="36"');
  const hasLabels = xml.includes('<bpmndi:BPMNLabel');
  const hasEdges = xml.includes('<bpmndi:BPMNEdge') && xml.includes('<di:waypoint');
  
  // Additional structural checks
  const hasCollaboration = xml.includes('<bpmn:collaboration') && xml.includes('<bpmn:participant');
  const hasLanes = xml.includes('<bpmn:laneSet') && xml.includes('<bpmn:lane');
  const hasDiagram = xml.includes('<bpmndi:BPMNDiagram') && xml.includes('<bpmndi:BPMNPlane');
  
  const isValid = hasAllElements && hasCollaboration && hasLanes && hasDiagram && 
                  hasParticipantShape && hasLabels && hasEdges;
  
  if (!isValid) {
    console.log('BPMN Validation Failed. Missing elements:', {
      hasAllElements,
      hasParticipantShape,
      hasProperTaskDimensions,
      hasProperEventDimensions,
      hasLabels,
      hasEdges
    });
  }
  
  return isValid;
}

// Function to process various file types for LLM consumption
async function processFileForLLM(file: File): Promise<{ fileName: string; fileType: string; content: string } | null> {
  try {
    const fileName = file.name;
    const fileType = file.type;
    
    // Text-based files
    if (fileType === 'application/json' || fileName.endsWith('.json')) {
      const content = await file.text();
      return { fileName, fileType: 'JSON', content };
    }
    
    if (fileType === 'text/plain' || fileName.endsWith('.tex') || fileName.endsWith('.latex')) {
      const content = await file.text();
      return { fileName, fileType: 'LaTeX/TEX', content };
    }
    
    if (fileType.includes('xml') || fileName.endsWith('.bpmn') || fileName.endsWith('.xml')) {
      const content = await file.text();
      return { fileName, fileType: 'XML/BPMN', content };
    }
    
    // Image files - convert to base64 for LLM vision capabilities
    if (fileType.startsWith('image/')) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:${fileType};base64,${base64}`;
      return { fileName, fileType: 'Image', content: `[Image file: ${fileName}] - Base64 data: ${dataUrl}` };
    }
    
    // PDF files - send raw content for LLM to process
    if (fileType === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return { fileName, fileType: 'PDF', content: `[PDF file: ${fileName}] - Raw PDF content in base64: ${base64.substring(0, 1000)}...` };
    }
    
    // Word documents - send raw content for LLM to process
    if (fileType.includes('word') || fileType.includes('document')) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return { fileName, fileType: 'Word Document', content: `[Word document: ${fileName}] - Raw document content in base64: ${base64.substring(0, 1000)}...` };
    }
    
    // Default: treat as text if possible
    try {
      const content = await file.text();
      return { fileName, fileType: 'Text File', content };
    } catch {
      // If can't read as text, provide file info
      return { fileName, fileType: 'Binary File', content: `[File: ${fileName}] - Binary file of type ${fileType}, size: ${file.size} bytes` };
    }
  } catch (error) {
    console.error('Error processing file for LLM:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user ID from token payload
    const user = await User.findOne({ email: payload.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if request is multipart (contains files) or JSON
    const contentType = request.headers.get('content-type') || '';
    let body: any;
    let files: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle file uploads with form data
      const formData = await request.formData();
      
      // Extract text fields
      body = {
        prompt: formData.get('prompt') as string,
        taskType: formData.get('taskType') as string,
        documentText: formData.get('documentText') as string,
        maxTokens: parseInt(formData.get('maxTokens') as string) || 4000,
        economyMode: formData.get('economyMode') === 'true'
      };

      // Extract files
      const fileEntries = Array.from(formData.entries())
        .filter(([key]) => key.startsWith('file_'))
        .map(([, value]) => value as File);
      files = fileEntries;
    } else {
      // Handle regular JSON requests
      body = await request.json();
    }

    const { 
      prompt, 
      taskType: frontendTaskType, 
      documentText, 
      maxTokens = 4000, // Increased default for complete diagrams
      economyMode = false 
    } = body;
    
    // Use intelligent intent detection, but respect explicit frontend taskType if provided
    let taskType = frontendTaskType;
    let detectedIntent = null;
    let intentConfidence = 'high';
    
    if (!taskType || taskType === 'general') {
      // Auto-detect intent when no specific task type is provided or when it's general
      detectedIntent = detectIntent(prompt, documentText);
      taskType = detectedIntent;
      
      // Determine confidence level based on prompt characteristics
      const promptLength = (prompt || '').length;
      const hasDocuments = !!documentText || files.length > 0;
      
      if (promptLength < 10 && !hasDocuments) {
        intentConfidence = 'low'; // Very short prompts are harder to classify
      } else if (promptLength < 30 && !hasDocuments) {
        intentConfidence = 'medium';
      }
      
      // Uncomment for debugging: console.log(`Intent Detection: ${detectedIntent} (confidence: ${intentConfidence})`);
    }

    if (!prompt && !documentText) {
      return NextResponse.json({ 
        error: 'Prompt or document text is required' 
      }, { status: 400 });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    // Process uploaded files and prepare content for LLM
    let fileContents: any[] = [];
    let fullInput = prompt || '';
    
    // Process each uploaded file
    for (const file of files) {
      const fileContent = await processFileForLLM(file);
      if (fileContent) {
        fileContents.push(fileContent);
      }
    }

    // Combine prompt, document text, and file contents
    if (documentText) {
      const cleanedDocText = cleanText(documentText);
      fullInput += (fullInput ? '\n\n' : '') + cleanedDocText;
    }

    // Add file contents to input
    if (fileContents.length > 0) {
      const fileContentText = fileContents.map(fc => 
        `\n\n--- ${fc.fileName} (${fc.fileType}) ---\n${fc.content}`
      ).join('');
      fullInput += fileContentText;
    }

    // Count tokens for monitoring (no truncation)
    const inputTokens = countTokens(fullInput);

    // Handle edge cases and provide fallback behavior for ambiguous prompts
    let responsePrefix = '';
    
    if (detectedIntent && intentConfidence === 'low') {
      // For low confidence detections, inform the user about the auto-detection
      responsePrefix = `I detected that you might want me to ${
        taskType === 'bpmn_generation' ? 'create a BPMN diagram' :
        taskType === 'latex_generation' ? 'generate a LaTeX document' :
        taskType === 'bpmn_question' ? 'answer a BPMN-related question' :
        'have a general conversation'
      }. If this isn't correct, please be more specific in your request.\n\n`;
    } else if (detectedIntent && intentConfidence === 'medium') {
      // For medium confidence, just provide a subtle indication
      responsePrefix = `Based on your request, I'll ${
        taskType === 'bpmn_generation' ? 'create a BPMN diagram' :
        taskType === 'latex_generation' ? 'generate a LaTeX document' :
        taskType === 'bpmn_question' ? 'help with your BPMN question' :
        'assist you'
      }.\n\n`;
    }
    
    // Construct system prompt based on task type
    let systemPrompt = '';
    switch (taskType) {
      case 'bpmn_generation':
        systemPrompt = `You are a BPMN 2.0 XML generator that creates **perfect bpmn.io compatible diagrams**.

### CRITICAL FORMAT REQUIREMENTS:

1. **XML Declaration & Root**:
   \`\`\`xml
   <?xml version="1.0" encoding="UTF-8"?>
   <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                     xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                     xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                     xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                     xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                     id="Definitions_1" 
                     targetNamespace="http://bpmn.io/schema/bpmn">
   \`\`\`

2. **Collaboration Structure**:
   - Always include \`<bpmn:collaboration id="Collaboration_1">\`
   - Add \`<bpmn:participant>\` with meaningful name and processRef

3. **Process with Lanes**:
   - \`<bpmn:process id="Process_1" isExecutable="false">\`
   - \`<bpmn:laneSet id="LaneSet_1">\` with proper lane structure
   - Each lane must have \`<bpmn:flowNodeRef>\` for ALL its elements

4. **Visual Layout Requirements**:
   - **Participant Shape**: \`<dc:Bounds x="120" y="60" width="800+" height="300+"/>\`
   - **Lane Shapes**: Proper dimensions with 30px left margin for labels
   - **Task Shapes**: \`width="100" height="80"\` (NOT 40!)
   - **Event Shapes**: \`width="36" height="36"\`
   - **All shapes MUST have**: \`<bpmndi:BPMNLabel />\`

5. **Required Visual Elements**:
   \`\`\`xml
   <bpmndi:BPMNDiagram id="BPMNDiagram_1">
     <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
       <!-- Participant shape with proper bounds -->
       <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1">
         <dc:Bounds x="120" y="60" width="828" height="300" />
         <bpmndi:BPMNLabel />
       </bpmndi:BPMNShape>
       
       <!-- Lane shapes with proper positioning -->
       <bpmndi:BPMNShape id="Lane_1_di" bpmnElement="Lane_1">
         <dc:Bounds x="150" y="60" width="798" height="180" />
         <bpmndi:BPMNLabel />
       </bpmndi:BPMNShape>
       
       <!-- Task shapes: 100x80 dimensions -->
       <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Activity_1">
         <dc:Bounds x="300" y="100" width="100" height="80" />
         <bpmndi:BPMNLabel />
       </bpmndi:BPMNShape>
   \`\`\`

6. **Edge Requirements**:
   - All \`<bpmndi:BPMNEdge>\` must have proper \`<di:waypoint>\` coordinates
   - Waypoints should connect element centers properly

7. **ID Conventions**:
   - Activities: \`Activity_1\`, \`Activity_2\`, etc.
   - Flows: \`Flow_1\`, \`Flow_2\`, etc.  
   - Events: \`StartEvent_1\`, \`Event_1\`, etc.
   - Lanes: \`Lane_1\`, \`Lane_2\`, etc.

### EXAMPLE STRUCTURE TO FOLLOW:
Generate XML that matches this exact structure and formatting style with proper indentation, complete visual layout, and professional bpmn.io compatibility.

RESPONSE FORMAT:
1. Process Description: Brief explanation
2. Complete BPMN XML: Following ALL above requirements exactly

### PROCESS DESCRIPTION REQUIREMENTS:
After generating the BPMN XML, provide a comprehensive description section that includes:

**DESCRIPTION:**
- **Process Name**: A clear, descriptive name for the process
- **Short Description**: 2-3 sentences explaining what the process does
- **Actors/Participants**: List all the roles/actors involved (e.g., Customer, Manager, System, etc.)
- **Key Tasks**: Main activities/tasks in the process
- **Process Flow**: Brief overview of the process flow from start to end
- **Decision Points**: Any decision points or gateways in the process
- **Outcomes**: What the process achieves or produces

Format the description as a structured text section that will be displayed below the diagram.

COMPLETE RESPONSE STRUCTURE:
1. Brief process overview (1-2 sentences)
2. Complete BPMN XML
3. Detailed structured description as specified above`;
        break;
      case 'latex_generation':
        systemPrompt = `You are a LaTeX document specialist for business processes. Generate complete LaTeX code based on the user's requirements.

RESPONSE FORMAT:
1. Document Overview: Clear explanation of the document structure
2. LaTeX Code: Complete, compilable LaTeX code

TECHNICAL REQUIREMENTS:
- Generate complete, compilable LaTeX code
- Include all necessary packages and configurations
- Use proper LaTeX syntax and best practices
- Ensure document compiles with standard distributions`;
        break;
      case 'bpmn_question':
        systemPrompt = `You are a BPMN process modeling expert and business analyst. Answer questions about business processes, BPMN methodology, and workflow optimization.

RESPONSE FORMAT:
- Clear, direct answers to questions
- Detailed explanations with examples
- Best practices and recommendations
- Structured formatting for readability`;
        break;
      default:
        systemPrompt = `You are a business process assistant. You can have friendly conversations about business processes, workflows, BPMN modeling, and LaTeX documentation.

RESPONSE FORMAT:
- Clear, helpful responses
- Structured formatting when appropriate
- Focus on business process topics`;
    }

    // Add economy mode instruction if enabled (but still allow complete responses)
    if (economyMode) {
      systemPrompt += ' Keep your response focused but ensure it is complete and not truncated.';
    }

    try {
      // Generate content with OpenAI GPT-4o Mini (with retry for BPMN generation)
      let aiResponse = '';
      let attempts = 0;
      const maxAttempts = taskType === 'bpmn_generation' ? 2 : 1;
      
      while (attempts < maxAttempts) {
        attempts++;
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user", 
              content: fullInput
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.1, // Low temperature for consistent, structured outputs
          top_p: 0.8, // Balanced for quality and consistency
        });

        aiResponse = completion.choices[0]?.message?.content || '';
        
        if (!aiResponse) {
          throw new Error('No response generated from OpenAI');
        }
        
        // For BPMN generation, check if we got valid XML structure
        if (taskType === 'bpmn_generation' && attempts < maxAttempts) {
          const tempResponse = aiResponse
            .replace(/```xml\s*/g, '')
            .replace(/```\s*$/g, '')
            .replace(/^[^<]*/, '')
            .trim();
          
          if (validateBPMNXML(tempResponse)) {
            break; // Valid XML generated, exit retry loop
          } else if (attempts < maxAttempts) {
            // Add more specific instructions for retry with exact format requirements
            const retryInstructions = `\n\nCRITICAL RETRY INSTRUCTIONS: The previous response failed validation. Generate PERFECT bpmn.io format XML that includes:

REQUIRED STRUCTURE:
1. <?xml version="1.0" encoding="UTF-8"?> 
2. <bpmn:definitions xmlns:xsi="..." xmlns:bpmn="..." xmlns:bpmndi="..." xmlns:dc="..." xmlns:di="..." id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
3. <bpmn:collaboration id="Collaboration_1"> with <bpmn:participant>
4. <bpmn:process id="Process_1" isExecutable="false"> with proper <bpmn:laneSet>
5. Each <bpmn:lane> must have <bpmn:flowNodeRef> for ALL its elements

VISUAL REQUIREMENTS:
- <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
- Participant shape: <dc:Bounds x="120" y="60" width="800+" height="300+"/>
- Task shapes: width="100" height="80" (NOT 40!)
- Event shapes: width="36" height="36"
- ALL shapes must have <bpmndi:BPMNLabel />
- Proper <bpmndi:BPMNEdge> with <di:waypoint> coordinates

FOLLOW THE EXACT STRUCTURE AND DIMENSIONS FROM THE EXAMPLE PROVIDED!`;
            
            // For retry, we'll add the retry instructions as a new user message
            const retryCompletion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: systemPrompt
                },
                {
                  role: "user", 
                  content: fullInput
                },
                {
                  role: "assistant",
                  content: aiResponse
                },
                {
                  role: "user",
                  content: retryInstructions
                }
              ],
              max_tokens: maxTokens,
              temperature: 0.1,
              top_p: 0.8,
            });
            
            aiResponse = retryCompletion.choices[0]?.message?.content || aiResponse;
            continue;
          }
        } else {
          break; // Not BPMN generation or max attempts reached
        }
      }

      // Clean up the response for BPMN generation
      let cleanedResponse = aiResponse;
      if (taskType === 'bpmn_generation') {
        // Remove any markdown formatting or explanations
        cleanedResponse = aiResponse
          .replace(/```xml\s*/g, '')
          .replace(/```\s*$/g, '')
          .replace(/^[^<]*/, '') // Remove any text before first <
          .trim();
        
        // ALWAYS ensure it starts with proper XML declaration
        if (!cleanedResponse.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
          cleanedResponse = '<?xml version="1.0" encoding="UTF-8"?>\n' + cleanedResponse;
        }
        
        // Ensure proper XML formatting and indentation
        cleanedResponse = cleanedResponse
          .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
          .replace(/>\s+</g, '>\n<') // Add line breaks between elements
          .replace(/\s+$/g, '') // Remove trailing whitespace
          .replace(/<bpmn:definitions/g, '  <bpmn:definitions') // Add proper indentation
          .replace(/<bpmn:collaboration/g, '    <bpmn:collaboration')
          .replace(/<bpmn:process/g, '    <bpmn:process')
          .replace(/<bpmn:laneSet/g, '      <bpmn:laneSet')
          .replace(/<bpmn:lane/g, '        <bpmn:lane')
          .replace(/<bpmn:startEvent/g, '      <bpmn:startEvent')
          .replace(/<bpmn:task/g, '      <bpmn:task')
          .replace(/<bpmn:sequenceFlow/g, '      <bpmn:sequenceFlow')
          .replace(/<bpmn:intermediateThrowEvent/g, '      <bpmn:intermediateThrowEvent')
          .replace(/<bpmndi:BPMNDiagram/g, '  <bpmndi:BPMNDiagram')
          .replace(/<bpmndi:BPMNPlane/g, '    <bpmndi:BPMNPlane')
          .replace(/<bpmndi:BPMNShape/g, '      <bpmndi:BPMNShape')
          .replace(/<bpmndi:BPMNEdge/g, '      <bpmndi:BPMNEdge')
          .trim();
        
        // Validate BPMN XML structure
        if (!validateBPMNXML(cleanedResponse)) {
          console.warn('Generated BPMN XML may be incomplete or malformed');
        }
        
        // Final check: ensure XML declaration is present and properly formatted
        if (!cleanedResponse.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
          console.warn('XML declaration missing, adding it');
          cleanedResponse = '<?xml version="1.0" encoding="UTF-8"?>\n' + cleanedResponse;
        }
      }

      // Combine response prefix with the actual response for better user experience
      const finalResponse = responsePrefix + cleanedResponse;
      
      // Return the response with metadata
      return NextResponse.json({
        success: true,
        response: finalResponse,
        metadata: {
          inputTokens,
          outputTokens: countTokens(finalResponse),
          taskType,
          detectedIntent: detectedIntent, // Show what was auto-detected
          intentConfidence: detectedIntent ? intentConfidence : undefined,
          wasAutoDetected: !!detectedIntent, // Flag indicating auto-detection was used
          economyMode,
          model: "gpt-4o-mini",
          provider: "openai",
          timestamp: new Date().toISOString()
        }
      });

    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      return NextResponse.json({ 
        error: 'Failed to generate response from OpenAI service' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in LLM API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

