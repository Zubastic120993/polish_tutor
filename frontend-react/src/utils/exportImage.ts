/**
 * DOM Element to PNG Export Utility
 * 
 * Converts any DOM element into a high-quality PNG image with support for:
 * - Emojis and special characters
 * - CSS gradients and shadows
 * - Rounded corners and borders
 * - Transparent backgrounds
 * - Retina/HiDPI displays (2x scaling)
 * 
 * @example
 * // Basic usage - download as PNG
 * const element = document.getElementById('badge-card');
 * await exportElementAsPng(element, 'my-badge.png');
 * 
 * @example
 * // Get data URL for preview or upload
 * const element = document.getElementById('stats-card');
 * const dataUrl = await getElementPngDataUrl(element);
 * if (dataUrl) {
 *   setPreviewImage(dataUrl);
 * }
 * 
 * @example
 * // With loading state
 * await exportElementAsPng(
 *   element,
 *   'screenshot.png',
 *   {
 *     onStart: () => setIsExporting(true),
 *     onFinish: () => setIsExporting(false)
 *   }
 * );
 */

import { toPng } from 'html-to-image';

/**
 * Options for image export operations
 */
export interface ExportOptions {
  /** Callback fired when export starts */
  onStart?: () => void;
  /** Callback fired when export finishes (success or error) */
  onFinish?: () => void;
  /** Custom pixel ratio (default: 2 for retina displays) */
  pixelRatio?: number;
  /** Background color (default: transparent) */
  backgroundColor?: string;
  /** Quality setting 0-1 (default: 1.0) */
  quality?: number;
}

/**
 * Default export options with retina scaling
 */
const DEFAULT_OPTIONS: Required<Omit<ExportOptions, 'onStart' | 'onFinish'>> = {
  pixelRatio: 2, // 2x for retina displays
  backgroundColor: 'transparent',
  quality: 1.0,
};

/**
 * Converts a DOM element to a PNG data URL
 * 
 * @param element - The HTML element to convert
 * @param options - Export options
 * @returns Promise resolving to data URL string, or null if failed
 * 
 * @example
 * const dataUrl = await getElementPngDataUrl(element);
 * if (dataUrl) {
 *   // Use the data URL (e.g., display in <img> tag, upload to server)
 *   console.log('Export successful:', dataUrl.substring(0, 50) + '...');
 * }
 */
export async function getElementPngDataUrl(
  element: HTMLElement | null,
  options: ExportOptions = {}
): Promise<string | null> {
  if (!element) {
    console.warn('[exportImage] Element not found or null');
    return null;
  }

  const { onStart, onFinish, ...exportOpts } = options;
  const mergedOptions = { ...DEFAULT_OPTIONS, ...exportOpts };

  try {
    // Notify start
    onStart?.();

    // Convert element to PNG data URL with html-to-image
    const dataUrl = await toPng(element, {
      cacheBust: true, // Prevent caching issues
      pixelRatio: mergedOptions.pixelRatio,
      backgroundColor: mergedOptions.backgroundColor,
      quality: mergedOptions.quality,
      // Filter out problematic nodes (e.g., scripts, iframes)
      filter: (node: Node) => {
        if (node instanceof HTMLElement) {
          const tagName = node.tagName.toLowerCase();
          return !['script', 'style', 'noscript'].includes(tagName);
        }
        return true;
      },
    });

    return dataUrl;
  } catch (error) {
    console.error('[exportImage] Failed to generate PNG data URL:', error);
    return null;
  } finally {
    // Notify finish
    onFinish?.();
  }
}

/**
 * Exports a DOM element as a PNG file (triggers download)
 * 
 * @param element - The HTML element to export
 * @param fileName - Name for the downloaded file (e.g., 'my-image.png')
 * @param options - Export options
 * @returns Promise resolving to true if successful, false if failed
 * 
 * @example
 * // Simple download
 * const success = await exportElementAsPng(
 *   document.getElementById('card'),
 *   'achievement-card.png'
 * );
 * 
 * @example
 * // With loading state and custom options
 * const success = await exportElementAsPng(
 *   element,
 *   'badge.png',
 *   {
 *     onStart: () => setLoading(true),
 *     onFinish: () => setLoading(false),
 *     pixelRatio: 3, // Extra high quality
 *     backgroundColor: '#ffffff'
 *   }
 * );
 */
export async function exportElementAsPng(
  element: HTMLElement | null,
  fileName: string,
  options: ExportOptions = {}
): Promise<boolean> {
  if (!element) {
    console.warn('[exportImage] Element not found or null');
    return false;
  }

  // Ensure fileName has .png extension
  const normalizedFileName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;

  try {
    // Generate data URL
    const dataUrl = await getElementPngDataUrl(element, options);

    if (!dataUrl) {
      console.error('[exportImage] Failed to generate image data');
      return false;
    }

    // Create temporary download link
    const link = document.createElement('a');
    link.download = normalizedFileName;
    link.href = dataUrl;
    link.style.display = 'none';

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      // Revoke object URL to free memory (if it's a blob URL)
      if (dataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(dataUrl);
      }
    }, 100);

    console.log(`[exportImage] Successfully exported: ${normalizedFileName}`);
    return true;
  } catch (error) {
    console.error('[exportImage] Failed to export PNG:', error);
    return false;
  }
}

/**
 * Helper to export multiple elements as separate PNG files
 * 
 * @param elements - Array of elements to export
 * @param fileNamePrefix - Prefix for file names (will add index)
 * @param options - Export options
 * @returns Promise resolving to number of successful exports
 * 
 * @example
 * const badges = document.querySelectorAll('.badge-card');
 * const count = await exportMultipleAsPng(
 *   Array.from(badges),
 *   'badge',
 *   { pixelRatio: 2 }
 * );
 * console.log(`Exported ${count} badges`);
 */
export async function exportMultipleAsPng(
  elements: HTMLElement[],
  fileNamePrefix: string,
  options: ExportOptions = {}
): Promise<number> {
  let successCount = 0;

  for (let i = 0; i < elements.length; i++) {
    const fileName = `${fileNamePrefix}-${i + 1}.png`;
    const success = await exportElementAsPng(elements[i], fileName, options);
    if (success) {
      successCount++;
    }
    // Small delay between exports to avoid overwhelming the browser
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return successCount;
}

/**
 * Utility to copy PNG to clipboard (browser support required)
 * 
 * @param element - The HTML element to copy
 * @param options - Export options
 * @returns Promise resolving to true if successful, false if failed
 * 
 * @example
 * const success = await copyElementToClipboard(element);
 * if (success) {
 *   showToast('Copied to clipboard!');
 * }
 */
export async function copyElementToClipboard(
  element: HTMLElement | null,
  options: ExportOptions = {}
): Promise<boolean> {
  if (!navigator.clipboard || !ClipboardItem) {
    console.warn('[exportImage] Clipboard API not supported in this browser');
    return false;
  }

  try {
    const dataUrl = await getElementPngDataUrl(element, options);
    if (!dataUrl) return false;

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Copy to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);

    console.log('[exportImage] Successfully copied to clipboard');
    return true;
  } catch (error) {
    console.error('[exportImage] Failed to copy to clipboard:', error);
    return false;
  }
}

