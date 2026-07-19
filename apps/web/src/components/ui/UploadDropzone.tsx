'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, AlertCircle, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

interface UploadDropzoneProps {
  onUploadSuccess: (doc: any) => void;
}

export default function UploadDropzone({ onUploadSuccess }: UploadDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setUploading(true);
    setError(null);

    const allowedExtensions = ['.pdf', '.docx', '.txt', '.md', '.png', '.jpg', '.jpeg'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      setError(`Unsupported file format. Please upload one of the following formats: PDF, DOCX, TXT, MD, PNG, JPG, JPEG.`);
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/storage/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      onUploadSuccess(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'File upload failed. Ensure size is under 10MB.');
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-colors select-none font-sans text-xs ${
        dragActive ? 'border-primary bg-primary/5' : 'border-border/60 bg-card/20'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleChange}
      />
      
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="font-semibold text-muted-foreground animate-pulse">Uploading file metadata...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2" onClick={onButtonClick}>
          <div className="h-12 w-12 rounded-xl bg-secondary/35 border border-border/40 flex items-center justify-center mb-1 hover:bg-secondary transition-colors cursor-pointer">
            <UploadCloud className="h-6 w-6 text-muted-foreground" />
          </div>
          <span className="font-semibold">Drag and drop file here, or click to browse</span>
          <span className="text-[10px] text-muted-foreground/60">PDF, TXT, MD, DOCX, PNG, JPG (Max 10MB)</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1 text-[10px] font-semibold text-rose-500 bg-rose-500/5 px-2.5 py-1 rounded border border-rose-500/10">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
