import React, { useRef } from 'react';
import { CalendarEvent } from '@calendar/core';
import { ICalExporter } from '@calendar/core/export';

interface ExportImportProps {
  events: CalendarEvent[];
  onImport: (events: CalendarEvent[]) => void;
}

export const ExportImport: React.FC<ExportImportProps> = ({ events, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleExport = () => {
    ICalExporter.downloadICS(events, `calendar-${new Date().toISOString().split('T')[0]}.ics`);
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const importedEvents = ICalExporter.parseICS(content);
        onImport(importedEvents);
      }
    };
    reader.readAsText(file);
    
    // 重置 input
    e.target.value = '';
  };
  
  return (
    <div className="export-import">
      <button className="btn-export" onClick={handleExport}>
        📥 导出 ICS
      </button>
      <button className="btn-import" onClick={handleImportClick}>
        📤 导入 ICS
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".ics,.ical"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};
