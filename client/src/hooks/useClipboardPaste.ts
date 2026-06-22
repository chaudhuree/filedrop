import { useEffect, useCallback } from 'react';
import { useClipboardStore } from '../stores/useClipboardStore';
import { detectClipboardContentType } from '../services/clipboard';

/**
 * Hook to handle paste events globally when the clipboard panel is active
 */
export function useClipboardPaste(isActive: boolean) {
  const setContent = useClipboardStore((s) => s.setContent);

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (!isActive) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      // Check for image paste first
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            event.preventDefault(); // Intercept image paste
            const reader = new FileReader();
            reader.onload = () => {
              setContent({
                type: 'image',
                data: reader.result as string,
                size: blob.size,
              });
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }

      // Check for HTML paste
      const htmlData = event.clipboardData?.getData('text/html');
      if (htmlData && htmlData.trim()) {
        const plainText = event.clipboardData?.getData('text/plain') || '';
        const hasRealHtml = /<(?:div|span|p|h[1-6]|ul|ol|li|table|img|a|strong|em|b|i)[^>]*>/i.test(htmlData);
        if (hasRealHtml) {
          event.preventDefault();
          setContent({
            type: 'html',
            data: htmlData,
            preview: plainText,
          });
          return;
        }
      }

      // Plain text / URL
      const textData = event.clipboardData?.getData('text/plain');
      if (textData) {
        const target = event.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

        if (isInput) {
          // Let the browser handle standard text paste inside text fields natively
          return;
        }

        event.preventDefault();
        const contentType = detectClipboardContentType(textData);
        setContent({
          type: contentType,
          data: textData,
        });
      }
    },
    [isActive, setContent]
  );

  useEffect(() => {
    if (!isActive) return;

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isActive, handlePaste]);
}
