const templates = [
  {
    name: "Blank Document",
    description: "A basic LaTeX document template with minimal structure",
    category: "Blank Document",
    content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}

\\geometry{margin=1in}

\\title{Document Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is a blank LaTeX document. You can start writing your content here.

\\section{Section Title}
Add your content in this section.

\\subsection{Subsection Title}
You can add subsections as needed.

\\section{Conclusion}
Conclude your document here.

\\end{document}`,
    isDefault: true
  },
  {
    name: "Guidelines Template",
    description: "Template for creating guidelines and procedures",
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
\\pagestyle{fancy}
\\fancyhf{}
\\rhead{Guidelines Document}
\\lhead{Company Name}

\\title{Guidelines Title}
\\author{Department Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\tableofcontents
\\newpage

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
    name: "Policy Process Template",
    description: "Template for policy and process documentation",
    category: "Policy Process",
    content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{fancyhdr}
\\usepackage{tikz}

\\geometry{margin=1in}
\\pagestyle{fancy}
\\fancyhf{}
\\rhead{Policy Document}
\\lhead{Organization Name}

\\title{Policy Title}
\\subtitle{Process Documentation}
\\author{Policy Owner}
\\date{\\today}

\\begin{document}

\\maketitle

\\tableofcontents
\\newpage

\\section{Executive Summary}
Brief overview of the policy and its objectives.

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
    name: "Runbook Standard Template",
    description: "Template for technical runbooks and procedures",
    category: "Runbook Standard",
    content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{fancyhdr}
\\usepackage{listings}
\\usepackage{xcolor}

\\geometry{margin=1in}
\\pagestyle{fancy}
\\fancyhf{}
\\rhead{Runbook}
\\lhead{Technical Operations}

\\title{Runbook Title}
\\subtitle{Standard Operating Procedure}
\\author{Technical Team}
\\date{\\today}

\\begin{document}

\\maketitle

\\tableofcontents
\\newpage

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
    name: "Operating Procedure Template",
    description: "Template for detailed operating procedures",
    category: "Operating Procedure",
    content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{fancyhdr}
\\usepackage{tikz}

\\geometry{margin=1in}
\\pagestyle{fancy}
\\fancyhf{}
\\rhead{Operating Procedure}
\\lhead{Department Name}

\\title{Operating Procedure Title}
\\subtitle{Standard Operating Procedure}
\\author{Procedure Owner}
\\date{\\today}

\\begin{document}

\\maketitle

\\tableofcontents
\\newpage

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

// Function to seed all templates
async function seedAllTemplates() {
  console.log('Starting to seed templates...');
  
  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    try {
      const response = await fetch('http://localhost:3000/api/latex-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });
      
      if (response.ok) {
        console.log(`✅ Template "${template.name}" seeded successfully`);
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to seed template "${template.name}":`, errorText);
      }
    } catch (error) {
      console.error(`❌ Error seeding template "${template.name}":`, error);
    }
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('Template seeding completed!');
}

// Run the seeding function
seedAllTemplates(); 