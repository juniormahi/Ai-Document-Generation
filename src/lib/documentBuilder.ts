// Document Builder - Converts JSON Schema to DOCX
import { 
  Document, 
  Paragraph, 
  HeadingLevel, 
  TextRun, 
  Packer, 
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  ImageRun,
  convertInchesToTwip,
  LevelFormat,
  ILevelsOptions,
} from "docx";
import type { 
  DocumentSchema, 
  AnyDocumentElement, 
  ParagraphElement,
  HeadingElement,
  ListElement,
  TableElement,
  ImageElement,
  TextRun as SchemaTextRun,
  DocumentTheme,
} from "./documentSchema";

// Convert hex color to DOCX format
function hexToDocxColor(hex: string): string {
  return hex.replace('#', '').toUpperCase();
}

// Get alignment type
function getAlignment(align?: string): typeof AlignmentType[keyof typeof AlignmentType] {
  switch (align) {
    case 'center': return AlignmentType.CENTER;
    case 'right': return AlignmentType.RIGHT;
    case 'justify': return AlignmentType.JUSTIFIED;
    default: return AlignmentType.LEFT;
  }
}

// Build text runs from schema with proper styling
function buildTextRuns(runs: SchemaTextRun[], theme: DocumentTheme): TextRun[] {
  return runs.map(run => new TextRun({
    text: run.text,
    bold: run.bold,
    italics: run.italic,
    underline: run.underline ? {} : undefined,
    color: run.color ? hexToDocxColor(run.color) : '000000',
    size: ((run.fontSize || theme.font_size || 12) * 2), // DOCX uses half-points
    font: theme.font_name || 'Calibri',
  }));
}

// Build paragraph element with proper styling
function buildParagraph(element: ParagraphElement, theme: DocumentTheme): Paragraph {
  const fontSize = theme.font_size || 12;
  const fontName = theme.font_name || 'Calibri';
  
  const children = element.text_runs 
    ? buildTextRuns(element.text_runs, theme)
    : element.text 
      ? [new TextRun({ 
          text: element.text, 
          font: fontName, 
          size: fontSize * 2,
        })]
      : [];

  return new Paragraph({
    children,
    alignment: getAlignment(element.alignment),
    spacing: { after: 200, line: 276 },
  });
}

// Build heading element with proper font embedding
function buildHeading(element: HeadingElement, theme: DocumentTheme): Paragraph {
  const headingLevelMap = {
    heading1: HeadingLevel.HEADING_1,
    heading2: HeadingLevel.HEADING_2,
    heading3: HeadingLevel.HEADING_3,
    heading4: HeadingLevel.HEADING_4,
  };

  const fontSizeMap = {
    heading1: 32,
    heading2: 26,
    heading3: 22,
    heading4: 18,
  };

  const headingFont = theme.heading_font || theme.font_name || 'Calibri';
  const fontSize = fontSizeMap[element.type] || 24;

  return new Paragraph({
    children: [
      new TextRun({
        text: element.text,
        bold: true,
        font: headingFont,
        size: fontSize * 2, // DOCX uses half-points
        color: hexToDocxColor(theme.primary_color || '#1a1a1a'),
      })
    ],
    heading: headingLevelMap[element.type],
    alignment: getAlignment(element.alignment),
    spacing: { 
      before: element.type === 'heading1' ? 0 : 400, 
      after: 200 
    },
  });
}

// Build list element with proper formatting
function buildList(element: ListElement, theme: DocumentTheme): Paragraph[] {
  const isBullet = element.type === 'bullet_list';
  const fontName = theme.font_name || 'Calibri';
  const fontSize = theme.font_size || 12;
  
  return element.items.map((item, index) => new Paragraph({
    children: [
      new TextRun({
        text: item,
        font: fontName,
        size: fontSize * 2,
      })
    ],
    bullet: isBullet ? { level: 0 } : undefined,
    numbering: !isBullet ? { reference: "default-numbering", level: 0 } : undefined,
    spacing: { after: 120, line: 276 },
    indent: { left: convertInchesToTwip(0.5) },
  }));
}

// Build table element with better formatting
function buildTable(element: TableElement, theme: DocumentTheme): Table {
  const fontName = theme.font_name || 'Calibri';
  const fontSize = theme.font_size || 12;
  
  const tableRows = element.rows.map((row, rowIndex) => {
    const cells = row.cells.map(cellText => {
      const isHeader = row.isHeader || rowIndex === 0;
      
      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: cellText,
                bold: isHeader,
                font: fontName,
                size: fontSize * 2,
              })
            ],
            spacing: { before: 60, after: 60 },
          })
        ],
        shading: isHeader ? {
          fill: 'E5E7EB',
          type: ShadingType.SOLID,
        } : element.style === 'striped' && rowIndex % 2 === 0 ? {
          fill: 'F9FAFB',
          type: ShadingType.SOLID,
        } : undefined,
        margins: {
          top: 60,
          bottom: 60,
          left: 100,
          right: 100,
        },
      });
    });

    return new TableRow({ children: cells });
  });

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// Build image element with proper type detection
async function buildImage(element: ImageElement): Promise<Paragraph | null> {
  if (!element.url) return null;

  try {
    // Fetch the image data
    let imageData: ArrayBuffer;
    let imageType: 'png' | 'jpg' | 'jpeg' | 'gif' | 'bmp' = 'png';
    
    if (element.url.startsWith('data:image')) {
      // Base64 image - extract the data and type
      const mimeMatch = element.url.match(/data:image\/(png|jpeg|jpg|gif|bmp);base64,/);
      if (mimeMatch) {
        imageType = mimeMatch[1] as any;
        if (imageType === 'jpeg') imageType = 'jpg';
      }
      
      const base64Data = element.url.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      imageData = bytes.buffer;
    } else {
      // External URL - fetch it
      const response = await fetch(element.url);
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        imageType = 'jpg';
      } else if (contentType.includes('gif')) {
        imageType = 'gif';
      }
      imageData = await response.arrayBuffer();
    }

    const widthInches = element.width_inches || 5;
    const heightInches = widthInches * 0.75; // Default 4:3 aspect ratio

    const children: (TextRun | ImageRun)[] = [
      new ImageRun({
        data: imageData,
        transformation: {
          width: convertInchesToTwip(widthInches) / 20, // Convert to EMUs
          height: convertInchesToTwip(heightInches) / 20,
        },
        type: imageType,
      })
    ];

    return new Paragraph({
      children,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
    });
  } catch (error) {
    console.error('Error building image:', error);
    // Return a placeholder paragraph if image fails
    return new Paragraph({
      children: [new TextRun({ text: `[Image: ${element.caption || element.ai_prompt || 'Image'}]`, italics: true })],
      alignment: AlignmentType.CENTER,
    });
  }
}

// Build divider
function buildDivider(): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: '─'.repeat(50),
        color: 'CCCCCC',
      })
    ],
    spacing: { before: 200, after: 200 },
    alignment: AlignmentType.CENTER,
  });
}

// Build a single element
async function buildElement(element: AnyDocumentElement, theme: DocumentTheme): Promise<(Paragraph | Table)[]> {
  switch (element.type) {
    case 'paragraph':
      return [buildParagraph(element as ParagraphElement, theme)];
    case 'heading1':
    case 'heading2':
    case 'heading3':
    case 'heading4':
      return [buildHeading(element as HeadingElement, theme)];
    case 'bullet_list':
    case 'numbered_list':
      return buildList(element as ListElement, theme);
    case 'table':
      return [buildTable(element as TableElement, theme)];
    case 'image':
      const img = await buildImage(element as ImageElement);
      return img ? [img] : [];
    case 'divider':
      return [buildDivider()];
    default:
      return [];
  }
}

// Main builder function - converts DocumentSchema to DOCX Blob
export async function buildDocxFromSchema(schema: DocumentSchema): Promise<Blob> {
  const theme = schema.theme;
  
  // Process all sections and elements
  const sectionsData = await Promise.all(schema.sections.map(async (section) => {
    const children: (Paragraph | Table)[] = [];
    
    // Build all elements (now async for image support)
    for (const element of section.elements) {
      const built = await buildElement(element, theme);
      children.push(...built);
    }

    // Build header if specified
    let header: Header | undefined;
    if (section.header) {
      const headerChildren: Paragraph[] = [];
      
      if (section.header.text) {
        headerChildren.push(new Paragraph({
          children: [
            new TextRun({
              text: section.header.text,
              font: theme.font_name,
              size: 18,
              color: hexToDocxColor(theme.secondary_color),
            })
          ],
          alignment: getAlignment(section.header.align),
        }));
      }
      
      if (section.header.show_page_numbers) {
        headerChildren.push(new Paragraph({
          children: [new TextRun({ children: [PageNumber.CURRENT] })],
          alignment: AlignmentType.RIGHT,
        }));
      }
      
      if (headerChildren.length > 0) {
        header = new Header({ children: headerChildren });
      }
    }

    // Build footer if specified
    let footer: Footer | undefined;
    if (section.footer) {
      const footerChildren: Paragraph[] = [];
      
      if (section.footer.text) {
        footerChildren.push(new Paragraph({
          children: [
            new TextRun({
              text: section.footer.text,
              font: theme.font_name,
              size: 16,
              color: hexToDocxColor(theme.secondary_color),
            })
          ],
          alignment: AlignmentType.CENTER,
        }));
      }
      
      if (section.footer.show_page_numbers) {
        footerChildren.push(new Paragraph({
          children: [
            new TextRun({ text: 'Page ', size: 16 }),
            new TextRun({ children: [PageNumber.CURRENT] }),
            new TextRun({ text: ' of ', size: 16 }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
          ],
          alignment: AlignmentType.CENTER,
        }));
      }
      
      if (footerChildren.length > 0) {
        footer = new Footer({ children: footerChildren });
      }
    }

    return {
      properties: {
        page: {
          size: section.orientation === 'landscape' 
            ? { width: 15840, height: 12240, orientation: 'landscape' as const }
            : undefined,
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
          },
        },
      },
      headers: header ? { default: header } : undefined,
      footers: footer ? { default: footer } : undefined,
      children,
    };
  }));

  const doc = new Document({
    creator: 'mydocmaker.com',
    title: schema.metadata.title,
    subject: schema.metadata.subject,
    sections: sectionsData,
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
                },
              },
            },
          ],
        },
      ],
    },
  });

  return await Packer.toBlob(doc);
}

// Convert legacy markdown content to DocumentSchema
export function markdownToSchema(
  markdown: string, 
  title: string, 
  themeName: string = 'modern'
): DocumentSchema {
  const { DOCUMENT_THEMES } = require('./documentSchema');
  const theme = DOCUMENT_THEMES[themeName] || DOCUMENT_THEMES.modern;
  
  const elements: AnyDocumentElement[] = [];
  const lines = markdown.split('\n');
  let currentList: string[] = [];
  let listType: 'bullet_list' | 'numbered_list' | null = null;

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      elements.push({ type: listType, items: [...currentList] });
      currentList = [];
      listType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    // Check for headings
    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match) {
      flushList();
      elements.push({ type: 'heading1', text: h1Match[1] });
      continue;
    }

    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      flushList();
      elements.push({ type: 'heading2', text: h2Match[1] });
      continue;
    }

    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      flushList();
      elements.push({ type: 'heading3', text: h3Match[1] });
      continue;
    }

    const h4Match = trimmed.match(/^####\s+(.+)$/);
    if (h4Match) {
      flushList();
      elements.push({ type: 'heading4', text: h4Match[1] });
      continue;
    }

    // Check for bullet list
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      if (listType !== 'bullet_list') {
        flushList();
        listType = 'bullet_list';
      }
      currentList.push(bulletMatch[1]);
      continue;
    }

    // Check for numbered list
    const numMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numMatch) {
      if (listType !== 'numbered_list') {
        flushList();
        listType = 'numbered_list';
      }
      currentList.push(numMatch[1]);
      continue;
    }

    // Check for divider
    if (trimmed.match(/^[-=_]{3,}$/)) {
      flushList();
      elements.push({ type: 'divider' });
      continue;
    }

    // Regular paragraph
    flushList();
    
    // Handle bold/italic
    const textRuns: any[] = [];
    let remaining = trimmed;
    
    // Simple parsing - just treat as plain text for now
    // Bold: **text** or __text__
    // Italic: *text* or _text_
    const cleanText = remaining
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1');
    
    elements.push({ 
      type: 'paragraph', 
      text: cleanText 
    });
  }

  flushList();

  return {
    metadata: { title },
    theme,
    sections: [{ elements }],
  };
}
