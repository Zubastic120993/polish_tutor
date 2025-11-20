/**
 * Example component demonstrating the exportImage utility
 * 
 * This shows how to use the image export functions with various features:
 * - Export button with loading state
 * - Preview before download
 * - Copy to clipboard
 * - Multiple export options
 */

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  exportElementAsPng,
  getElementPngDataUrl,
  copyElementToClipboard,
} from '../utils/exportImage';

export function ExportImageExample() {
  const [isExporting, setIsExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    const success = await exportElementAsPng(cardRef.current, 'achievement-card.png', {
      onStart: () => setIsExporting(true),
      onFinish: () => setIsExporting(false),
      pixelRatio: 2,
    });

    if (success) {
      alert('✅ Image exported successfully!');
    } else {
      alert('❌ Failed to export image');
    }
  };

  const handlePreview = async () => {
    setIsExporting(true);
    const dataUrl = await getElementPngDataUrl(cardRef.current, {
      pixelRatio: 2,
    });
    setIsExporting(false);

    if (dataUrl) {
      setPreviewUrl(dataUrl);
    }
  };

  const handleCopyToClipboard = async () => {
    const success = await copyElementToClipboard(cardRef.current, {
      onStart: () => setIsExporting(true),
      onFinish: () => setIsExporting(false),
    });

    if (success) {
      alert('📋 Copied to clipboard!');
    } else {
      alert('❌ Failed to copy to clipboard');
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold">Image Export Example</h2>

      {/* Example card to export */}
      <div
        ref={cardRef}
        className="max-w-md rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-8 text-white shadow-2xl"
      >
        <div className="space-y-4">
          <h3 className="text-3xl font-bold">🏆 Achievement Unlocked!</h3>
          <p className="text-lg">You've mastered 100 Polish phrases!</p>
          <div className="rounded-xl bg-white/20 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Level 10</span>
              <span className="text-2xl">🇵🇱</span>
            </div>
          </div>
        </div>
      </div>

      {/* Export controls */}
      <div className="flex flex-wrap gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleExport}
          disabled={isExporting}
          className="rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-600 disabled:opacity-50"
        >
          {isExporting ? '⏳ Exporting...' : '💾 Export as PNG'}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePreview}
          disabled={isExporting}
          className="rounded-lg bg-green-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-green-600 disabled:opacity-50"
        >
          {isExporting ? '⏳ Loading...' : '👁️ Preview'}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopyToClipboard}
          disabled={isExporting}
          className="rounded-lg bg-purple-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-purple-600 disabled:opacity-50"
        >
          {isExporting ? '⏳ Copying...' : '📋 Copy to Clipboard'}
        </motion.button>
      </div>

      {/* Preview */}
      {previewUrl && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Preview (2x quality):</h3>
          <div className="rounded-lg border-2 border-gray-300 p-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full"
              style={{ maxWidth: '400px' }}
            />
          </div>
          <button
            onClick={() => setPreviewUrl(null)}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Clear preview
          </button>
        </div>
      )}

      {/* Code example */}
      <div className="rounded-lg bg-gray-900 p-6 text-left">
        <pre className="overflow-x-auto text-sm text-green-400">
          <code>{`// Usage in your component:
import { exportElementAsPng } from '@/utils/exportImage';

const cardRef = useRef<HTMLDivElement>(null);

const handleExport = async () => {
  await exportElementAsPng(
    cardRef.current,
    'my-card.png',
    {
      onStart: () => setLoading(true),
      onFinish: () => setLoading(false),
      pixelRatio: 2, // Retina quality
    }
  );
};

<div ref={cardRef}>
  {/* Your content here */}
</div>`}</code>
        </pre>
      </div>
    </div>
  );
}

