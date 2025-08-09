const templates = [
  {
    name: "Blank Page (Default)",
    description: "A basic LaTeX document template with minimal structure for simple documents",
    category: "Blank Document",
    content: `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{LaTeX Document}
\\author{Author}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is a sample LaTeX document. You can edit it in the editor.

\\end{document}`,
    isDefault: true
  },
  {
    name: "Guidelines Template",
    description: "Template for creating guidelines and procedures with clear structure",
    category: "Guidelines",
    content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{fancyhdr}

\\geometry{margin=1in}

\\title{Guidelines Title}
\\author{Department Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Purpose}
This document outlines the guidelines for [specific process or procedure].

\\section{Scope}
These guidelines apply to [describe scope and applicability].

\\section{Definitions}
\\begin{itemize}
    \\item \\textbf{Term 1}: Definition of term 1
    \\item \\textbf{Term 2}: Definition of term 2
    \\item \\textbf{Term 3}: Definition of term 3
\\end{itemize}

\\section{Guidelines}
\\subsection{General Principles}
\\begin{enumerate}
    \\item First principle
    \\item Second principle
    \\item Third principle
\\end{enumerate}

\\subsection{Specific Guidelines}
\\subsubsection{Guideline 1}
Description of the first guideline.

\\subsubsection{Guideline 2}
Description of the second guideline.

\\section{Responsibilities}
\\begin{itemize}
    \\item \\textbf{Manager}: [Responsibilities]
    \\item \\textbf{Team Member}: [Responsibilities]
    \\item \\textbf{Stakeholder}: [Responsibilities]
\\end{itemize}

\\section{Compliance}
This section describes compliance requirements and monitoring.

\\section{Review and Updates}
This document will be reviewed [frequency] and updated as necessary.

\\end{document}`,
    isDefault: false
  },
  {
    name: "Process Template",
    description: "Template for documenting business processes and workflows",
    category: "Process",
    content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{fancyhdr}

\\geometry{margin=1in}

\\title{Process Title}
\\author{Process Owner}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Process Overview}
Brief description of the process and its objectives.

\\section{Process Scope}
This process covers [describe what the process includes and excludes].

\\section{Process Objectives}
\\begin{itemize}
    \\item Objective 1
    \\item Objective 2
    \\item Objective 3
\\end{itemize}

\\section{Process Steps}
\\subsection{Step 1: Initiation}
\\begin{enumerate}
    \\item Action 1
    \\item Action 2
    \\item Action 3
\\end{enumerate}

\\subsection{Step 2: Execution}
\\begin{enumerate}
    \\item Action 1
    \\item Action 2
    \\item Action 3
\\end{enumerate}

\\subsection{Step 3: Completion}
\\begin{enumerate}
    \\item Action 1
    \\item Action 2
    \\item Action 3
\\end{enumerate}

\\section{Roles and Responsibilities}
\\begin{itemize}
    \\item \\textbf{Process Owner}: [Responsibilities]
    \\item \\textbf{Process Manager}: [Responsibilities]
    \\item \\textbf{Team Members}: [Responsibilities]
\\end{itemize}

\\section{Inputs and Outputs}
\\subsection{Inputs}
\\begin{itemize}
    \\item Input 1
    \\item Input 2
    \\item Input 3
\\end{itemize}

\\subsection{Outputs}
\\begin{itemize}
    \\item Output 1
    \\item Output 2
    \\item Output 3
\\end{itemize}

\\section{Performance Metrics}
\\begin{itemize}
    \\item Metric 1: [Description]
    \\item Metric 2: [Description]
    \\item Metric 3: [Description]
\\end{itemize}

\\section{Process Controls}
Description of controls and checkpoints in the process.

\\end{document}`,
    isDefault: false
  },
  {
    name: "Policy Template",
    description: "Template for creating organizational policies and procedures",
    category: "Policy",
    content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{fancyhdr}

\\geometry{margin=1in}

\\title{Policy Title}
\\author{Policy Owner}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Policy Statement}
Clear statement of the policy and its intent.

\\section{Scope and Applicability}
\\subsection{Scope}
This policy applies to [describe scope].

\\subsection{Applicability}
This policy is applicable to [describe who it applies to].

\\section{Definitions}
\\begin{description}
    \\item[Term 1] Definition of term 1
    \\item[Term 2] Definition of term 2
    \\item[Term 3] Definition of term 3
\\end{description}

\\section{Policy Details}
\\subsection{General Requirements}
\\begin{enumerate}
    \\item Requirement 1
    \\item Requirement 2
    \\item Requirement 3
\\end{enumerate}

\\subsection{Specific Procedures}
\\subsubsection{Procedure 1}
Step-by-step description of procedure 1.

\\subsubsection{Procedure 2}
Step-by-step description of procedure 2.

\\section{Roles and Responsibilities}
\\begin{itemize}
    \\item \\textbf{Policy Owner}: [Responsibilities]
    \\item \\textbf{Process Manager}: [Responsibilities]
    \\item \\textbf{Team Members}: [Responsibilities]
\\end{itemize}

\\section{Compliance and Monitoring}
\\subsection{Compliance Requirements}
Description of compliance requirements.

\\subsection{Monitoring and Reporting}
How compliance will be monitored and reported.

\\section{Exceptions and Appeals}
Process for handling exceptions and appeals.

\\section{Review and Maintenance}
\\subsection{Review Schedule}
This policy will be reviewed [frequency].

\\subsection{Update Process}
Process for updating the policy.

\\section{References}
\\begin{itemize}
    \\item Reference 1
    \\item Reference 2
    \\item Reference 3
\\end{itemize}

\\end{document}`,
    isDefault: false
  },
  {
    name: "Run Book Template",
    description: "Template for technical runbooks and operational procedures",
    category: "Runbook",
    content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{fancyhdr}

\\geometry{margin=1in}

\\title{Runbook Title}
\\author{Technical Team}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Overview}
Brief description of the procedure and its purpose.

\\section{Prerequisites}
\\subsection{Required Access}
\\begin{itemize}
    \\item Access level 1
    \\item Access level 2
    \\item Access level 3
\\end{itemize}

\\subsection{Required Tools}
\\begin{itemize}
    \\item Tool 1
    \\item Tool 2
    \\item Tool 3
\\end{itemize}

\\section{Procedure}
\\subsection{Step 1: Preparation}
\\begin{enumerate}
    \\item Preparation step 1
    \\item Preparation step 2
    \\item Preparation step 3
\\end{enumerate}

\\subsection{Step 2: Execution}
\\begin{enumerate}
    \\item Execution step 1
    \\item Execution step 2
    \\item Execution step 3
\\end{enumerate}

\\subsection{Step 3: Verification}
\\begin{enumerate}
    \\item Verification step 1
    \\item Verification step 2
    \\item Verification step 3
\\end{enumerate}

\\section{Troubleshooting}
\\subsection{Common Issues}
\\begin{description}
    \\item[Issue 1] Description and solution
    \\item[Issue 2] Description and solution
    \\item[Issue 3] Description and solution
\\end{description}

\\subsection{Error Messages}
Common error messages and their resolutions.

\\section{Post-Procedure}
\\subsection{Cleanup}
Steps to clean up after the procedure.

\\subsection{Documentation}
What to document after completing the procedure.

\\section{References}
\\begin{itemize}
    \\item Related documentation 1
    \\item Related documentation 2
    \\item Related documentation 3
\\end{itemize}

\\section{Contact Information}
\\begin{itemize}
    \\item Primary contact: [Name and contact]
    \\item Secondary contact: [Name and contact]
    \\item Emergency contact: [Name and contact]
\\end{itemize}

\\end{document}`,
    isDefault: false
  },
  {
    name: "Standard Operating Procedure (SOP) Template",
    description: "Template for detailed standard operating procedures",
    category: "SOP",
    content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{fancyhdr}

\\geometry{margin=1in}

\\title{Standard Operating Procedure Title}
\\author{Procedure Owner}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Procedure Overview}
\\subsection{Purpose}
Clear statement of the procedure's purpose.

\\subsection{Scope}
What this procedure covers and what it doesn't.

\\subsection{Objectives}
Specific objectives of this procedure.

\\section{Definitions}
\\begin{description}
    \\item[Term 1] Definition of term 1
    \\item[Term 2] Definition of term 2
    \\item[Term 3] Definition of term 3
\\end{description}

\\section{Responsibilities}
\\begin{itemize}
    \\item \\textbf{Primary Operator}: [Responsibilities]
    \\item \\textbf{Supervisor}: [Responsibilities]
    \\item \\textbf{Support Staff}: [Responsibilities]
\\end{itemize}

\\section{Equipment and Materials}
\\subsection{Required Equipment}
\\begin{itemize}
    \\item Equipment 1
    \\item Equipment 2
    \\item Equipment 3
\\end{itemize}

\\subsection{Required Materials}
\\begin{itemize}
    \\item Material 1
    \\item Material 2
    \\item Material 3
\\end{itemize}

\\section{Safety Considerations}
\\subsection{Safety Precautions}
\\begin{enumerate}
    \\item Safety precaution 1
    \\item Safety precaution 2
    \\item Safety precaution 3
\\end{enumerate}

\\subsection{Emergency Procedures}
What to do in case of emergency.

\\section{Procedure Steps}
\\subsection{Pre-Procedure}
\\begin{enumerate}
    \\item Pre-procedure step 1
    \\item Pre-procedure step 2
    \\item Pre-procedure step 3
\\end{enumerate}

\\subsection{Main Procedure}
\\begin{enumerate}
    \\item Main step 1
    \\item Main step 2
    \\item Main step 3
\\end{enumerate}

\\subsection{Post-Procedure}
\\begin{enumerate}
    \\item Post-procedure step 1
    \\item Post-procedure step 2
    \\item Post-procedure step 3
\\end{enumerate}

\\section{Quality Control}
\\subsection{Inspection Points}
Key points to inspect during the procedure.

\\subsection{Acceptance Criteria}
Criteria for accepting the completed work.

\\section{Troubleshooting}
\\subsection{Common Problems}
\\begin{description}
    \\item[Problem 1] Solution and corrective action
    \\item[Problem 2] Solution and corrective action
    \\item[Problem 3] Solution and corrective action
\\end{description}

\\section{Documentation}
What records to keep and how to maintain them.

\\section{Training Requirements}
Training needed to perform this procedure.

\\section{References}
\\begin{itemize}
    \\item Reference document 1
    \\item Reference document 2
    \\item Reference document 3
\\end{itemize}

\\end{document}`,
    isDefault: false
  }
];

// Function to clear existing templates and seed new ones
async function seedTemplates() {
  try {
    console.log('Starting template seeding process...');
    
    // First, clear all existing templates
    const clearResponse = await fetch('http://localhost:3000/api/latex-templates', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (clearResponse.ok) {
      console.log('Existing templates cleared successfully');
    } else {
      console.error('Failed to clear existing templates');
    }
    
    // Then seed each template
    for (const template of templates) {
      const response = await fetch('http://localhost:3000/api/latex-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });
      
      if (response.ok) {
        console.log(`Template "${template.name}" seeded successfully`);
      } else {
        console.error(`Failed to seed template "${template.name}"`);
      }
    }
    
    console.log('Template seeding process completed!');
  } catch (error) {
    console.error('Error seeding templates:', error);
  }
}

// Export for use in other scripts
export { templates, seedTemplates }; 