import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

/**
 * Removes emojis from text
 */
const removeEmojis = (text: string): string => {
  // Remove emojis using Unicode ranges
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags (iOS)
    .replace(/[\u{2600}-\u{26FF}]/gu, '') // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // Variation Selectors
    .replace(/[\u{200D}]/gu, '') // Zero Width Joiner
    .replace(/[\u{200B}]/gu, '') // Zero Width Space
    .trim();
};

/**
 * Parses markdown and converts to DOCX paragraphs
 */
const markdownToDocxElements = (markdown: string): Paragraph[] => {
  const paragraphs: Paragraph[] = [];
  // Remove emojis from markdown before processing
  const cleanedMarkdown = removeEmojis(markdown);
  const lines = cleanedMarkdown.split('\n');
  
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        if (codeBlockContent.length > 0) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: codeBlockContent.join('\n'),
                  font: 'Courier New',
                  size: 20,
                }),
              ],
              spacing: { after: 200 },
            })
          );
          codeBlockContent = [];
        }
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    
    // Empty line
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      continue;
    }
    
    // Headers
    if (line.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.replace(/^#\s+/, ''),
              bold: true,
              size: 32, // 16pt
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 240, before: 240 },
          border: {
            bottom: {
              color: '404040',
              size: 1,
              style: 'single',
            },
          },
        })
      );
      continue;
    }
    
    if (line.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.replace(/^##\s+/, ''),
              bold: true,
              size: 28, // 14pt
              color: '34d399', // emerald-400
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 180, before: 180 },
        })
      );
      continue;
    }
    
    if (line.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.replace(/^###\s+/, ''),
              bold: true,
              size: 24, // 12pt
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 144, before: 144 },
        })
      );
      continue;
    }
    
    // Lists
    if (line.match(/^\s*[-*+]\s+/)) {
      const text = line.replace(/^\s*[-*+]\s+/, '').trim();
      paragraphs.push(
        new Paragraph({
          text: `• ${text}`,
          spacing: { after: 100 },
        })
      );
      continue;
    }
    
    if (line.match(/^\s*\d+\.\s+/)) {
      const text = line.replace(/^\s*\d+\.\s+/, '').trim();
      paragraphs.push(
        new Paragraph({
          text: `${i + 1}. ${text}`,
          spacing: { after: 100 },
        })
      );
      continue;
    }
    
    // Regular paragraph with inline formatting
    let text = line;
    const children: TextRun[] = [];
    
    // Handle inline code first (before other formatting)
    const codeRegex = /`([^`]+)`/g;
    const parts: Array<{ text: string; isCode: boolean }> = [];
    let lastIndex = 0;
    let match;
    
    while ((match = codeRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index), isCode: false });
      }
      parts.push({ text: match[1], isCode: true });
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), isCode: false });
    }
    
    if (parts.length === 0) {
      parts.push({ text, isCode: false });
    }
    
    // Process each part for bold/italic
    for (const part of parts) {
      if (part.isCode) {
        children.push(
          new TextRun({
            text: part.text,
            font: 'Courier New',
            size: 20, // 10pt
            color: '6ee7b7', // emerald-300
          })
        );
      } else {
        // Handle bold and italic in non-code text
        const boldItalicRegex = /(\*\*)(.*?)(\*\*)|(\*)(.*?)(\*)/g;
        let partText = part.text;
        let partLastIndex = 0;
        let partMatch;
        let hasMatches = false;
        
        while ((partMatch = boldItalicRegex.exec(partText)) !== null) {
          hasMatches = true;
          if (partMatch.index > partLastIndex) {
            children.push(new TextRun({ text: partText.substring(partLastIndex, partMatch.index) }));
          }
          
          if (partMatch[1] === '**') {
            // Bold
            children.push(new TextRun({ text: partMatch[2], bold: true }));
          } else if (partMatch[4] === '*') {
            // Italic
            children.push(new TextRun({ text: partMatch[5], italics: true }));
          }
          
          partLastIndex = partMatch.index + partMatch[0].length;
        }
        
        if (partLastIndex < partText.length) {
          children.push(new TextRun({ text: partText.substring(partLastIndex) }));
        }
        
        if (!hasMatches) {
          children.push(new TextRun({ text: partText }));
        }
      }
    }
    
    if (children.length === 0) {
      children.push(new TextRun({ text }));
    }
    
    paragraphs.push(
      new Paragraph({
        children,
        spacing: { after: 120 },
      })
    );
  }
  
  return paragraphs;
};

/**
 * Parses markdown and converts to PDF text elements
 */
interface PDFTextElement {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'code' | 'codeblock' | 'list' | 'blockquote' | 'hr' | 'table';
  text: string;
  items?: string[];
  tableData?: string[][];
}

const parseMarkdownForPDF = (content: string): PDFTextElement[] => {
  const elements: PDFTextElement[] = [];
  const lines = content.split('\n');
  
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let currentParagraph: string[] = [];
  
  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const paragraphText = currentParagraph.join(' ').trim();
      if (paragraphText) {
        elements.push({ type: 'p', text: paragraphText });
      }
      currentParagraph = [];
    }
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Handle code blocks
    if (trimmedLine.startsWith('```')) {
      flushParagraph();
      if (inCodeBlock) {
        // End code block
        if (codeBlockContent.length > 0) {
          elements.push({
            type: 'codeblock',
            text: codeBlockContent.join('\n'),
          });
          codeBlockContent = [];
        }
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    
    // Handle tables
    if (line.includes('|') && trimmedLine.includes('|') && !trimmedLine.match(/^\|[\s\-:]+\|$/)) {
      flushParagraph();
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      const cells = line.split('|').map(cell => cell.trim()).filter((_cell, idx, arr) => {
        // Filter out empty cells at start/end from split
        return idx > 0 && idx < arr.length - 1;
      });
      if (cells.length > 0) {
        tableRows.push(cells);
      }
      continue;
    } else if (trimmedLine.match(/^\|[\s\-:]+\|$/)) {
      // Table separator, skip
      continue;
    } else {
      if (inTable && tableRows.length > 0) {
        flushParagraph();
        elements.push({
          type: 'table',
          text: '',
          tableData: [...tableRows],
        });
        tableRows = [];
        inTable = false;
      }
    }
    
    // Handle lists
    if (line.match(/^\s*[-*+]\s+/)) {
      flushParagraph();
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(line.replace(/^\s*[-*+]\s+/, '').trim());
      continue;
    } else if (line.match(/^\s*\d+\.\s+/)) {
      flushParagraph();
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(line.replace(/^\s*\d+\.\s+/, '').trim());
      continue;
    } else {
      if (inList && listItems.length > 0) {
        flushParagraph();
        elements.push({
          type: 'list',
          text: '',
          items: [...listItems],
        });
        listItems = [];
        inList = false;
      }
    }
    
    // Empty line - flush paragraph and add spacing
    if (!trimmedLine) {
      flushParagraph();
      continue;
    }
    
    // Headers (check all levels, must be at start of line)
    if (trimmedLine.match(/^#{1,6}\s+/)) {
      flushParagraph();
      const match = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const headerType = `h${Math.min(level, 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
        elements.push({
          type: headerType,
          text: text,
        });
      }
      continue;
    }
    
    // Blockquote
    if (trimmedLine.startsWith('>')) {
      flushParagraph();
      const quoteText = trimmedLine.replace(/^>\s*/, '').trim();
      if (quoteText) {
        elements.push({
          type: 'blockquote',
          text: quoteText,
        });
      }
      continue;
    }
    
    // Horizontal rule
    if (trimmedLine.match(/^[-*_]{3,}$/)) {
      flushParagraph();
      elements.push({ type: 'hr', text: '' });
      continue;
    }
    
    // Regular paragraph text - accumulate until empty line or special element
    currentParagraph.push(trimmedLine);
  }
  
  // Flush remaining paragraph
  flushParagraph();
  
  // Handle remaining list items
  if (inList && listItems.length > 0) {
    elements.push({
      type: 'list',
      text: '',
      items: [...listItems],
    });
  }
  
  // Handle remaining table
  if (inTable && tableRows.length > 0) {
    elements.push({
      type: 'table',
      text: '',
      tableData: [...tableRows],
    });
  }
  
  // Handle remaining code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push({
      type: 'codeblock',
      text: codeBlockContent.join('\n'),
    });
  }
  
  return elements;
};

/**
 * Strips markdown formatting from text and removes emojis
 */
const stripMarkdown = (text: string): string => {
  return removeEmojis(
    text
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1') // Italic (but not if it's part of **)
      .replace(/`([^`]+)`/g, '$1') // Inline code
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
      .replace(/~~(.+?)~~/g, '$1') // Strikethrough
      .replace(/^#{1,6}\s+/gm, '') // Headers
      .replace(/^[-*+]\s+/gm, '') // List markers
      .replace(/^\d+\.\s+/gm, '') // Numbered list markers
      .replace(/^>\s+/gm, '') // Blockquote markers
  );
};

/**
 * Wraps text to fit within page width
 */
const wrapText = (pdf: jsPDF, text: string, maxWidth: number): string[] => {
  // Split by spaces
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let currentLine = '';
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word.trim() && word) {
      // Preserve whitespace
      currentLine += word;
      continue;
    }
    
    const testLine = currentLine ? `${currentLine}${word}` : word;
    const width = pdf.getTextWidth(testLine);
    
    if (width > maxWidth && currentLine.trim()) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  return lines;
};

/**
 * Exports markdown content to PDF with text-based rendering
 */
export const exportToPDF = async (content: string, filename: string = 'data-scientist-response.pdf') => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let yPosition = margin;
    const baseLineHeight = 6;
    const paragraphSpacing = 8;
    
    // Remove emojis from content before parsing
    const cleanedContent = removeEmojis(content);
    // Parse markdown content
    const elements = parseMarkdownForPDF(cleanedContent);
    
    // Helper to check and add new page if needed
    const checkPageBreak = (requiredHeight: number) => {
      if (yPosition + requiredHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };
    
    // Process each element
    for (const element of elements) {
      checkPageBreak(baseLineHeight * 3);
      
      switch (element.type) {
        case 'h1': {
          const text = stripMarkdown(element.text);
          pdf.setFontSize(22);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          const lines = wrapText(pdf, text, maxWidth);
          yPosition += baseLineHeight * 1.5; // Space before header
          for (const line of lines) {
            checkPageBreak(baseLineHeight * 3);
            pdf.text(line, margin, yPosition);
            yPosition += baseLineHeight * 2.8;
          }
          // Add border line
          pdf.setDrawColor(64, 64, 64);
          pdf.setLineWidth(0.5);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += paragraphSpacing * 2;
          break;
        }
        
        case 'h2': {
          const text = stripMarkdown(element.text);
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(52, 211, 153); // emerald-400
          const lines = wrapText(pdf, text, maxWidth);
          yPosition += baseLineHeight * 1.2; // Space before header
          for (const line of lines) {
            checkPageBreak(baseLineHeight * 2.5);
            pdf.text(line, margin, yPosition);
            yPosition += baseLineHeight * 2.2;
          }
          yPosition += paragraphSpacing * 1.5;
          break;
        }
        
        case 'h3': {
          const text = stripMarkdown(element.text);
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(100, 100, 100);
          const lines = wrapText(pdf, text, maxWidth);
          yPosition += baseLineHeight; // Space before header
          for (const line of lines) {
            checkPageBreak(baseLineHeight * 2);
            pdf.text(line, margin, yPosition);
            yPosition += baseLineHeight * 1.8;
          }
          yPosition += paragraphSpacing;
          break;
        }
        
        case 'h4':
        case 'h5':
        case 'h6': {
          const text = stripMarkdown(element.text);
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(80, 80, 80);
          const lines = wrapText(pdf, text, maxWidth);
          yPosition += baseLineHeight * 0.8;
          for (const line of lines) {
            checkPageBreak(baseLineHeight * 1.8);
            pdf.text(line, margin, yPosition);
            yPosition += baseLineHeight * 1.6;
          }
          yPosition += paragraphSpacing;
          break;
        }
        
        case 'table': {
          if (element.tableData && element.tableData.length > 0) {
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            const cellPadding = 4;
            const rowHeight = baseLineHeight * 2;
            const colWidth = maxWidth / element.tableData[0].length;
            yPosition += baseLineHeight * 0.5;
            
            // Draw table
            for (let rowIdx = 0; rowIdx < element.tableData.length; rowIdx++) {
              const row = element.tableData[rowIdx];
              const maxCellLines = Math.max(...row.map(cell => {
                const cellText = stripMarkdown(cell || '');
                return wrapText(pdf, cellText, colWidth - cellPadding * 2).length;
              }), 1);
              const actualRowHeight = rowHeight * maxCellLines;
              
              checkPageBreak(actualRowHeight);
              
              // Header row styling
              if (rowIdx === 0) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFillColor(240, 240, 240);
                pdf.rect(margin, yPosition, maxWidth, actualRowHeight, 'F');
              } else {
                pdf.setFont('helvetica', 'normal');
              }
              
              let xPos = margin;
              for (let colIdx = 0; colIdx < row.length; colIdx++) {
                const cellText = stripMarkdown(row[colIdx] || '');
                const wrapped = wrapText(pdf, cellText, colWidth - cellPadding * 2);
                
                // Draw cell border
                pdf.setDrawColor(200, 200, 200);
                pdf.setLineWidth(0.3);
                pdf.rect(xPos, yPosition, colWidth, actualRowHeight, 'S');
                
                // Draw text
                let textY = yPosition + cellPadding + baseLineHeight;
                for (const line of wrapped) {
                  pdf.text(line, xPos + cellPadding, textY);
                  textY += baseLineHeight * 1.3;
                }
                
                xPos += colWidth;
              }
              
              yPosition += actualRowHeight;
            }
            yPosition += paragraphSpacing;
          }
          break;
        }
        
        case 'codeblock': {
          pdf.setFontSize(11);
          pdf.setFont('courier', 'normal');
          pdf.setTextColor(0, 0, 0);
          // Remove emojis from code block content
          const cleanedCode = removeEmojis(element.text);
          const lines = cleanedCode.split('\n');
          yPosition += baseLineHeight * 0.5;
          checkPageBreak(baseLineHeight * (lines.length + 2));
          for (const line of lines) {
            checkPageBreak(baseLineHeight * 1.5);
            const wrapped = wrapText(pdf, line, maxWidth - 10);
            for (const wrappedLine of wrapped) {
              pdf.text(wrappedLine, margin + 5, yPosition);
              yPosition += baseLineHeight * 1.4;
            }
          }
          yPosition += paragraphSpacing;
          break;
        }
        
        case 'list': {
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 0);
          if (element.items) {
            yPosition += baseLineHeight * 0.3;
            for (const item of element.items) {
              const text = stripMarkdown(item);
              checkPageBreak(baseLineHeight * 2);
              pdf.text('•', margin, yPosition);
              const lines = wrapText(pdf, text, maxWidth - 12);
              for (let i = 0; i < lines.length; i++) {
                pdf.text(lines[i], margin + 10, yPosition);
                if (i < lines.length - 1) {
                  yPosition += baseLineHeight * 1.3;
                  checkPageBreak(baseLineHeight * 1.3);
                }
              }
              yPosition += baseLineHeight * 1.5;
            }
          }
          yPosition += paragraphSpacing;
          break;
        }
        
        case 'blockquote': {
          const text = stripMarkdown(element.text);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(100, 100, 100);
          pdf.setDrawColor(16, 185, 129); // emerald-500
          pdf.setLineWidth(1.5);
          const quoteHeight = baseLineHeight * 2;
          pdf.line(margin, yPosition - baseLineHeight, margin, yPosition + quoteHeight);
          yPosition += baseLineHeight * 0.5;
          const lines = wrapText(pdf, text, maxWidth - 10);
          for (const line of lines) {
            checkPageBreak(baseLineHeight * 1.6);
            pdf.text(line, margin + 6, yPosition);
            yPosition += baseLineHeight * 1.6;
          }
          yPosition += paragraphSpacing;
          break;
        }
        
        case 'hr': {
          checkPageBreak(baseLineHeight * 3);
          yPosition += baseLineHeight;
          pdf.setDrawColor(64, 64, 64);
          pdf.setLineWidth(0.5);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += baseLineHeight * 2;
          break;
        }
        
        case 'p': {
          if (!element.text.trim()) {
            yPosition += baseLineHeight * 0.8;
            break;
          }
          
          // Check for inline code in paragraph
          const hasInlineCode = element.text.includes('`');
          const text = stripMarkdown(element.text);
          
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 0);
          
          // Handle inline code by splitting and rendering separately
          if (hasInlineCode) {
            const parts = element.text.split(/`([^`]+)`/);
            let currentX = margin;
            let currentY = yPosition;
            
            for (let i = 0; i < parts.length; i++) {
              if (i % 2 === 0) {
                // Regular text (preserve emojis)
                const regularText = stripMarkdown(parts[i]);
                if (regularText.trim()) {
                  const lines = wrapText(pdf, regularText, maxWidth - (currentX - margin));
                  for (const line of lines) {
                    checkPageBreak(baseLineHeight * 1.7);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(12);
                    pdf.text(line, currentX, currentY);
                    currentY += baseLineHeight * 1.7;
                    currentX = margin;
                  }
                }
              } else {
                // Inline code
                const codeText = parts[i];
                pdf.setFont('courier', 'normal');
                pdf.setFontSize(11);
                pdf.setTextColor(110, 231, 183); // emerald-300
                const codeLines = wrapText(pdf, codeText, maxWidth - (currentX - margin));
                for (const line of codeLines) {
                  checkPageBreak(baseLineHeight * 1.7);
                  pdf.text(line, currentX, currentY);
                  currentY += baseLineHeight * 1.7;
                  currentX = margin;
                }
                pdf.setTextColor(0, 0, 0);
              }
            }
            yPosition = currentY;
          } else {
            const lines = wrapText(pdf, text, maxWidth);
            for (const line of lines) {
              checkPageBreak(baseLineHeight * 1.7);
              pdf.text(line, margin, yPosition);
              yPosition += baseLineHeight * 1.7;
            }
          }
          
          yPosition += paragraphSpacing;
          break;
        }
      }
    }
    
    // Save PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export PDF');
  }
};

/**
 * Exports markdown content to DOCX with UI-matching formatting
 */
export const exportToDOCX = async (content: string, filename: string = 'data-scientist-response.docx') => {
  try {
    const paragraphs = markdownToDocxElements(content);
    
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });
    
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to DOCX:', error);
    throw new Error('Failed to export DOCX');
  }
};

