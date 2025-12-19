import { useMemo, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Edit3, Check, X } from "lucide-react";
import type { DocumentSchema, AnyDocumentElement, ImageElement } from "@/lib/documentSchema";

interface DocumentJsonPreviewProps {
  schema: DocumentSchema | null;
  className?: string;
  processingImages?: boolean;
  onSchemaChange?: (schema: DocumentSchema) => void;
}

// Render a single element to HTML-like preview
function asPlainText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "text" in (value as any)) {
    const t = (value as any).text;
    return typeof t === "string" ? t : String(t ?? "");
  }
  if (value == null) return "";
  return String(value);
}

function renderElement(element: AnyDocumentElement, index: number): React.ReactNode {
  const key = `element-${index}`;

  switch (element.type) {
    case 'heading1':
      return (
        <h1
          key={key}
          className="text-3xl font-bold text-primary mb-4 mt-6"
          style={{ textAlign: element.alignment || 'left' }}
        >
          {asPlainText((element as any).text)}
        </h1>
      );

    case 'heading2':
      return (
        <h2
          key={key}
          className="text-2xl font-semibold text-foreground mb-3 mt-5"
          style={{ textAlign: element.alignment || 'left' }}
        >
          {asPlainText((element as any).text)}
        </h2>
      );

    case 'heading3':
      return (
        <h3
          key={key}
          className="text-xl font-medium text-foreground mb-2 mt-4"
          style={{ textAlign: element.alignment || 'left' }}
        >
          {asPlainText((element as any).text)}
        </h3>
      );

    case 'heading4':
      return (
        <h4
          key={key}
          className="text-lg font-medium text-foreground/90 mb-2 mt-3"
          style={{ textAlign: element.alignment || 'left' }}
        >
          {asPlainText((element as any).text)}
        </h4>
      );

    case 'paragraph':
      if ((element as any).text_runs) {
        return (
          <p key={key} className="mb-3 leading-relaxed" style={{ textAlign: element.alignment || 'left' }}>
            {(element as any).text_runs.map((run: any, i: number) => (
              <span
                key={i}
                className={`${run?.bold ? 'font-bold' : ''} ${run?.italic ? 'italic' : ''} ${run?.underline ? 'underline' : ''}`}
                style={{ color: run?.color ? `#${String(run.color)}` : undefined }}
              >
                {asPlainText(run?.text)}
              </span>
            ))}
          </p>
        );
      }
      return (
        <p
          key={key}
          className="mb-3 leading-relaxed whitespace-pre-wrap"
          style={{ textAlign: element.alignment || 'left' }}
        >
          {asPlainText((element as any).text)}
        </p>
      );

    case 'bullet_list':
      return (
        <ul key={key} className="list-disc list-inside mb-4 space-y-1 pl-4">
          {(element as any).items.map((item: any, i: number) => (
            <li key={i} className="text-foreground/90">{asPlainText(item)}</li>
          ))}
        </ul>
      );

    case 'numbered_list':
      return (
        <ol key={key} className="list-decimal list-inside mb-4 space-y-1 pl-4">
          {(element as any).items.map((item: any, i: number) => (
            <li key={i} className="text-foreground/90">{asPlainText(item)}</li>
          ))}
        </ol>
      );

    case 'table':
      return (
        <div key={key} className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse border border-border">
            <tbody>
              {(element as any).rows.map((row: any, rowIdx: number) => (
                <tr
                  key={rowIdx}
                  className={row.isHeader || rowIdx === 0 ? 'bg-muted' : rowIdx % 2 === 0 && (element as any).style === 'striped' ? 'bg-muted/50' : ''}
                >
                  {row.cells.map((cell: any, cellIdx: number) => {
                    const CellTag = row.isHeader || rowIdx === 0 ? 'th' : 'td';
                    return (
                      <CellTag
                        key={cellIdx}
                        className="border border-border px-3 py-2 text-sm text-left"
                      >
                        {asPlainText(cell)}
                      </CellTag>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'divider':
      return <hr key={key} className="my-4 border-border" />;

    case 'image':
      const imgElement = element as ImageElement;
      if (imgElement.url) {
        return (
          <figure key={key} className="my-4">
            <img
              src={imgElement.url}
              alt={imgElement.caption || imgElement.ai_prompt || 'Document image'}
              className="max-w-full h-auto rounded-lg border border-border mx-auto"
              style={{
                width: imgElement.width_inches ? `${imgElement.width_inches}in` : 'auto',
                maxWidth: '100%'
              }}
            />
            {imgElement.caption && (
              <figcaption className="text-center text-sm text-muted-foreground mt-2 italic">
                {asPlainText(imgElement.caption)}
              </figcaption>
            )}
          </figure>
        );
      } else if (imgElement.ai_prompt) {
        // Show placeholder for unprocessed images
        return (
          <div
            key={key}
            className="my-4 p-8 border-2 border-dashed border-border rounded-lg bg-muted/30 flex flex-col items-center justify-center gap-2"
          >
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground text-center">
              Generating: {asPlainText(imgElement.ai_prompt).substring(0, 50)}...
            </p>
          </div>
        );
      }
      return (
        <div key={key} className="my-4 p-8 border border-dashed border-border rounded-lg bg-muted/30 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      );

    default:
      return null;
  }
}

export function DocumentJsonPreview({ schema, className, processingImages, onSchemaChange }: DocumentJsonPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSchema, setEditedSchema] = useState<DocumentSchema | null>(null);

  const handleStartEdit = useCallback(() => {
    if (schema) {
      setEditedSchema(JSON.parse(JSON.stringify(schema))); // Deep clone
      setIsEditing(true);
    }
  }, [schema]);

  const handleSaveEdit = useCallback(() => {
    if (editedSchema && onSchemaChange) {
      onSchemaChange(editedSchema);
    }
    setIsEditing(false);
  }, [editedSchema, onSchemaChange]);

  const handleCancelEdit = useCallback(() => {
    setEditedSchema(null);
    setIsEditing(false);
  }, []);

  const handleElementChange = useCallback((sectionIdx: number, elementIdx: number, newText: string) => {
    if (!editedSchema) return;
    
    const updated = JSON.parse(JSON.stringify(editedSchema)) as DocumentSchema;
    const element = updated.sections[sectionIdx]?.elements[elementIdx];
    if (element) {
      if ('text' in element) {
        (element as any).text = newText;
      } else if ('text_runs' in element) {
        (element as any).text_runs = [{ text: newText }];
      }
    }
    setEditedSchema(updated);
  }, [editedSchema]);

  const handleListItemChange = useCallback((sectionIdx: number, elementIdx: number, itemIdx: number, newText: string) => {
    if (!editedSchema) return;
    
    const updated = JSON.parse(JSON.stringify(editedSchema)) as DocumentSchema;
    const element = updated.sections[sectionIdx]?.elements[elementIdx] as any;
    if (element?.items) {
      element.items[itemIdx] = newText;
    }
    setEditedSchema(updated);
  }, [editedSchema]);

  const handleTableCellChange = useCallback((sectionIdx: number, elementIdx: number, rowIdx: number, cellIdx: number, newText: string) => {
    if (!editedSchema) return;
    
    const updated = JSON.parse(JSON.stringify(editedSchema)) as DocumentSchema;
    const element = updated.sections[sectionIdx]?.elements[elementIdx] as any;
    if (element?.rows?.[rowIdx]?.cells) {
      element.rows[rowIdx].cells[cellIdx] = newText;
    }
    setEditedSchema(updated);
  }, [editedSchema]);

  const currentSchema = isEditing ? editedSchema : schema;

  const renderEditableElement = useCallback((element: AnyDocumentElement, sectionIdx: number, elementIdx: number): React.ReactNode => {
    const key = `element-${sectionIdx}-${elementIdx}`;
    const editableClass = isEditing ? "cursor-text hover:bg-primary/5 focus:outline-none focus:bg-primary/10 rounded px-1 -mx-1" : "";

    switch (element.type) {
      case 'heading1':
        return (
          <h1
            key={key}
            className={`text-3xl font-bold text-primary mb-4 mt-6 ${editableClass}`}
            style={{ textAlign: element.alignment || 'left' }}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => isEditing && handleElementChange(sectionIdx, elementIdx, e.currentTarget.textContent || '')}
          >
            {asPlainText((element as any).text)}
          </h1>
        );

      case 'heading2':
        return (
          <h2
            key={key}
            className={`text-2xl font-semibold text-foreground mb-3 mt-5 ${editableClass}`}
            style={{ textAlign: element.alignment || 'left' }}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => isEditing && handleElementChange(sectionIdx, elementIdx, e.currentTarget.textContent || '')}
          >
            {asPlainText((element as any).text)}
          </h2>
        );

      case 'heading3':
        return (
          <h3
            key={key}
            className={`text-xl font-medium text-foreground mb-2 mt-4 ${editableClass}`}
            style={{ textAlign: element.alignment || 'left' }}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => isEditing && handleElementChange(sectionIdx, elementIdx, e.currentTarget.textContent || '')}
          >
            {asPlainText((element as any).text)}
          </h3>
        );

      case 'heading4':
        return (
          <h4
            key={key}
            className={`text-lg font-medium text-foreground/90 mb-2 mt-3 ${editableClass}`}
            style={{ textAlign: element.alignment || 'left' }}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => isEditing && handleElementChange(sectionIdx, elementIdx, e.currentTarget.textContent || '')}
          >
            {asPlainText((element as any).text)}
          </h4>
        );

      case 'paragraph':
        if ((element as any).text_runs && !isEditing) {
          return (
            <p key={key} className="mb-3 leading-relaxed" style={{ textAlign: element.alignment || 'left' }}>
              {(element as any).text_runs.map((run: any, i: number) => (
                <span
                  key={i}
                  className={`${run?.bold ? 'font-bold' : ''} ${run?.italic ? 'italic' : ''} ${run?.underline ? 'underline' : ''}`}
                  style={{ color: run?.color ? `#${String(run.color)}` : undefined }}
                >
                  {asPlainText(run?.text)}
                </span>
              ))}
            </p>
          );
        }
        return (
          <p
            key={key}
            className={`mb-3 leading-relaxed whitespace-pre-wrap ${editableClass}`}
            style={{ textAlign: element.alignment || 'left' }}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => isEditing && handleElementChange(sectionIdx, elementIdx, e.currentTarget.textContent || '')}
          >
            {asPlainText((element as any).text || (element as any).text_runs?.map((r: any) => r.text).join('') || '')}
          </p>
        );

      case 'bullet_list':
        return (
          <ul key={key} className="list-disc list-inside mb-4 space-y-1 pl-4">
            {(element as any).items.map((item: any, i: number) => (
              <li 
                key={i} 
                className={`text-foreground/90 ${editableClass}`}
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={(e) => isEditing && handleListItemChange(sectionIdx, elementIdx, i, e.currentTarget.textContent || '')}
              >
                {asPlainText(item)}
              </li>
            ))}
          </ul>
        );

      case 'numbered_list':
        return (
          <ol key={key} className="list-decimal list-inside mb-4 space-y-1 pl-4">
            {(element as any).items.map((item: any, i: number) => (
              <li 
                key={i} 
                className={`text-foreground/90 ${editableClass}`}
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={(e) => isEditing && handleListItemChange(sectionIdx, elementIdx, i, e.currentTarget.textContent || '')}
              >
                {asPlainText(item)}
              </li>
            ))}
          </ol>
        );

      case 'table':
        return (
          <div key={key} className="mb-4 overflow-x-auto">
            <table className="w-full border-collapse border border-border">
              <tbody>
                {(element as any).rows.map((row: any, rowIdx: number) => (
                  <tr
                    key={rowIdx}
                    className={row.isHeader || rowIdx === 0 ? 'bg-muted' : rowIdx % 2 === 0 && (element as any).style === 'striped' ? 'bg-muted/50' : ''}
                  >
                    {row.cells.map((cell: any, cellIdx: number) => {
                      const CellTag = row.isHeader || rowIdx === 0 ? 'th' : 'td';
                      return (
                        <CellTag
                          key={cellIdx}
                          className={`border border-border px-3 py-2 text-sm text-left ${editableClass}`}
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onBlur={(e) => isEditing && handleTableCellChange(sectionIdx, elementIdx, rowIdx, cellIdx, e.currentTarget.textContent || '')}
                        >
                          {asPlainText(cell)}
                        </CellTag>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'divider':
        return <hr key={key} className="my-4 border-border" />;

      case 'image':
        const imgElement = element as ImageElement;
        if (imgElement.url) {
          return (
            <figure key={key} className="my-4">
              <img
                src={imgElement.url}
                alt={imgElement.caption || imgElement.ai_prompt || 'Document image'}
                className="max-w-full h-auto rounded-lg border border-border mx-auto"
                style={{
                  width: imgElement.width_inches ? `${imgElement.width_inches}in` : 'auto',
                  maxWidth: '100%'
                }}
              />
              {imgElement.caption && (
                <figcaption className="text-center text-sm text-muted-foreground mt-2 italic">
                  {asPlainText(imgElement.caption)}
                </figcaption>
              )}
            </figure>
          );
        } else if (imgElement.ai_prompt) {
          return (
            <div
              key={key}
              className="my-4 p-8 border-2 border-dashed border-border rounded-lg bg-muted/30 flex flex-col items-center justify-center gap-2"
            >
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground text-center">
                Generating: {asPlainText(imgElement.ai_prompt).substring(0, 50)}...
              </p>
            </div>
          );
        }
        return (
          <div key={key} className="my-4 p-8 border border-dashed border-border rounded-lg bg-muted/30 flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        );

      default:
        return null;
    }
  }, [isEditing, handleElementChange, handleListItemChange, handleTableCellChange]);

  const content = useMemo(() => {
    if (!currentSchema || !currentSchema.sections) return null;

    return currentSchema.sections.map((section, sectionIdx) => (
      <div key={`section-${sectionIdx}`} className="mb-8">
        {section.header?.text && (
          <div 
            className="text-xs text-muted-foreground mb-4 pb-2 border-b border-border"
            style={{ textAlign: section.header.align || 'left' }}
          >
            {section.header.text}
          </div>
        )}
        
        {section.elements.map((element, elementIdx) => 
          renderEditableElement(element, sectionIdx, elementIdx)
        )}
        
        {section.footer?.text && (
          <div className="text-xs text-muted-foreground mt-4 pt-2 border-t border-border text-center">
            {section.footer.text}
          </div>
        )}
      </div>
    ));
  }, [currentSchema, renderEditableElement]);

  if (!schema) {
    return (
      <Card className={`p-8 flex items-center justify-center ${className}`}>
        <p className="text-muted-foreground">No document to preview</p>
      </Card>
    );
  }

  // Get theme colors for the preview
  const primaryColor = currentSchema?.theme?.primary_color ? `#${currentSchema.theme.primary_color}` : undefined;

  return (
    <Card className={`bg-white dark:bg-slate-50 relative ${className}`}>
      {/* Edit toolbar */}
      {onSchemaChange && (
        <div className="absolute top-2 right-2 z-20 flex gap-2">
          {isEditing ? (
            <>
              <Button size="sm" onClick={handleSaveEdit} className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white">
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-8 px-3">
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={handleStartEdit} className="h-8 px-3">
              <Edit3 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      )}

      {processingImages && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center gap-3 bg-card px-4 py-2 rounded-lg shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">Generating images...</span>
          </div>
        </div>
      )}
      
      {isEditing && (
        <div className="absolute top-2 left-2 z-20 bg-primary/10 text-primary text-xs px-2 py-1 rounded">
          Click text to edit
        </div>
      )}
      
      <ScrollArea className="h-full">
        <div 
          className="p-8 min-h-full text-slate-900"
          style={{ 
            fontFamily: currentSchema?.theme?.font_name || 'Calibri, sans-serif',
            fontSize: `${currentSchema?.theme?.font_size || 11}pt`,
            '--primary-doc-color': primaryColor,
          } as React.CSSProperties}
        >
          {/* Document Title from metadata */}
          {currentSchema?.metadata?.title && !currentSchema.sections[0]?.elements.some(e => e.type === 'heading1') && (
            <h1 
              className="text-3xl font-bold mb-6 text-center"
              style={{ color: primaryColor }}
            >
              {currentSchema.metadata.title}
            </h1>
          )}
          
          {content}
        </div>
      </ScrollArea>
    </Card>
  );
}
