/**
 * Utility function to clean up LaTeX content before it's processed by the visual editor
 * This helps ensure that LaTeX commands are properly handled and don't appear as raw text
 */
export function cleanLatexContent(content: string): string {
    if (!content) return '';

    // Replace any raw LaTeX commands that might have been incorrectly preserved
    let cleanedContent = content;

    // Handle section commands
    cleanedContent = cleanedContent.replace(/\\section\{([^}]*)\}/g, '\\section{$1}');
    cleanedContent = cleanedContent.replace(/\\subsection\{([^}]*)\}/g, '\\subsection{$1}');
    cleanedContent = cleanedContent.replace(/\\subsubsection\{([^}]*)\}/g, '\\subsubsection{$1}');
    cleanedContent = cleanedContent.replace(/\\paragraph\{([^}]*)\}/g, '\\paragraph{$1}');
    cleanedContent = cleanedContent.replace(/\\subparagraph\{([^}]*)\}/g, '\\subparagraph{$1}');

    // Ensure proper spacing around commands
    cleanedContent = cleanedContent.replace(/\\section\{([^}]*)\}([^\n])/g, '\\section{$1}\n$2');
    cleanedContent = cleanedContent.replace(/\\subsection\{([^}]*)\}([^\n])/g, '\\subsection{$1}\n$2');
    cleanedContent = cleanedContent.replace(/\\subsubsection\{([^}]*)\}([^\n])/g, '\\subsubsection{$1}\n$2');
    cleanedContent = cleanedContent.replace(/\\paragraph\{([^}]*)\}([^\n])/g, '\\paragraph{$1}\n$2');
    cleanedContent = cleanedContent.replace(/\\subparagraph\{([^}]*)\}([^\n])/g, '\\subparagraph{$1}\n$2');

    return cleanedContent;
} 