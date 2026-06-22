import { useState, useCallback, useEffect, useRef } from 'react';

interface UseFileDropReturn {
  isDragging: boolean;
  droppedFiles: File[];
  clearFiles: () => void;
}

/**
 * Hook for drag-and-drop file handling
 */
export function useFileDrop(elementRef: React.RefObject<HTMLElement | null>): UseFileDropReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) {
      setDroppedFiles(files);
    }
  }, []);

  const clearFiles = useCallback(() => {
    setDroppedFiles([]);
  }, []);

  useEffect(() => {
    const el = elementRef.current || document.body;

    el.addEventListener('dragenter', handleDragEnter);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('drop', handleDrop);

    return () => {
      el.removeEventListener('dragenter', handleDragEnter);
      el.removeEventListener('dragleave', handleDragLeave);
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('drop', handleDrop);
    };
  }, [elementRef, handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return { isDragging, droppedFiles, clearFiles };
}
