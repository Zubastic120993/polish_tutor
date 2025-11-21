/**
 * PDF Export Utility
 * 
 * Exports DOM elements as A4 landscape PDFs by first converting to PNG,
 * then embedding in a PDF with proper scaling for retina displays.
 * 
 * @example
 * // Basic usage
 * const element = document.getElementById('share-card');
 * await exportElementAsPdf(element, 'profile-card.pdf');
 * 
 * @example
 * // With options and loading state
 * await exportElementAsPdf(
 *   element,
 *   'achievement.pdf',
 *   {
 *     onStart: () => setLoading(true),
 *     onFinish: () => setLoading(false),
 *     quality: 0.95,
 *     backgroundColor: '#ffffff'
 *   }
 * );
 */

import jsPDF from 'jspdf';
import { getElementPngDataUrl } from './exportImage';
import type { ExportOptions } from './exportImage';

// A4 landscape dimensions in millimeters
const A4_LANDSCAPE_WIDTH_MM = 297;
const A4_LANDSCAPE_HEIGHT_MM = 210;

/**
 * PDF export options extending base export options
 */
export interface PdfExportOptions extends ExportOptions {
  /** JPEG quality for PDF compression (0-1, default: 1.0) */
  quality?: number;
  /** Background color for PDF (default: transparent) */
  backgroundColor?: string;
}

/**
 * Calculate A4 landscape dimensions in pixels for a given pixel ratio
 * 
 * @param pixelRatio - Device pixel ratio (e.g., 2 for retina displays)
 * @returns Width and height in pixels
 * 
 * @example
 * const { widthPx, heightPx } = getA4LandscapeSizePx(2);
 * console.log(`A4 landscape at 2x: ${widthPx}px × ${heightPx}px`);
 */
export function getA4LandscapeSizePx(pixelRatio: number): {
  widthPx: number;
  heightPx: number;
} {
  // Convert mm to pixels (assuming 96 DPI base)
  const MM_TO_PX = 3.7795275591; // 1mm = 3.78 pixels at 96 DPI
  
  return {
    widthPx: Math.round(A4_LANDSCAPE_WIDTH_MM * MM_TO_PX * pixelRatio),
    heightPx: Math.round(A4_LANDSCAPE_HEIGHT_MM * MM_TO_PX * pixelRatio),
  };
}

/**
 * Exports a DOM element as an A4 landscape PDF
 * 
 * Process:
 * 1. Convert element to high-resolution PNG using html-to-image
 * 2. Create A4 landscape PDF document
 * 3. Scale PNG proportionally to fit full width
 * 4. Center vertically if needed
 * 5. Trigger download
 * 
 * @param element - The HTML element to export
 * @param fileName - Name for the downloaded PDF file (e.g., 'card.pdf')
 * @param options - Export options (quality, callbacks, etc.)
 * @returns Promise resolving to true if successful, false if failed
 * 
 * @example
 * // Simple download
 * const success = await exportElementAsPdf(
 *   document.getElementById('share-card'),
 *   'profile-card.pdf'
 * );
 * 
 * @example
 * // With loading state and custom quality
 * const success = await exportElementAsPdf(
 *   element,
 *   'achievement.pdf',
 *   {
 *     onStart: () => setExporting(true),
 *     onFinish: () => setExporting(false),
 *     quality: 0.92,
 *     backgroundColor: '#f8f9fa'
 *   }
 * );
 */
export async function exportElementAsPdf(
  element: HTMLElement | null,
  fileName: string,
  options: PdfExportOptions = {}
): Promise<boolean> {
  if (!element) {
    console.warn('[exportPdf] Element not found or null');
    return false;
  }

  // Ensure fileName has .pdf extension
  const normalizedFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  const {
    onStart,
    onFinish,
    quality = 1.0,
    backgroundColor = 'transparent',
    pixelRatio = 2,
  } = options;

  try {
    // Notify start
    onStart?.();

    // Step 1: Convert element to PNG data URL (high resolution for retina)
    console.log('[exportPdf] Converting element to PNG...');
    const pngDataUrl = await getElementPngDataUrl(element, {
      pixelRatio,
      quality,
      backgroundColor,
    });

    if (!pngDataUrl) {
      console.error('[exportPdf] Failed to generate PNG data URL');
      return false;
    }

    // Step 2: Load PNG to get dimensions
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load PNG image'));
      img.src = pngDataUrl;
    });

    const pngWidth = img.width;
    const pngHeight = img.height;
    console.log('[exportPdf] PNG dimensions:', pngWidth, 'x', pngHeight);

    // Step 3: Create A4 landscape PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Step 4: Calculate scaling to fit width while maintaining aspect ratio
    const pdfWidth = A4_LANDSCAPE_WIDTH_MM;
    const pdfHeight = A4_LANDSCAPE_HEIGHT_MM;

    // Scale to full width, calculate proportional height
    const scaledWidth = pdfWidth;
    const scaledHeight = (pngHeight / pngWidth) * pdfWidth;

    // Center vertically if the content is shorter than page height
    const yOffset = scaledHeight < pdfHeight 
      ? (pdfHeight - scaledHeight) / 2 
      : 0;

    console.log('[exportPdf] Scaled dimensions:', scaledWidth, 'x', scaledHeight);
    console.log('[exportPdf] Y offset:', yOffset);

    // Step 5: Add PNG to PDF
    // Use JPEG compression for better file size (quality parameter)
    const imageFormat = backgroundColor === 'transparent' ? 'PNG' : 'JPEG';
    
    pdf.addImage(
      pngDataUrl,
      imageFormat,
      0, // x position (left edge)
      yOffset, // y position (vertically centered or top)
      scaledWidth,
      scaledHeight,
      undefined, // alias
      imageFormat === 'JPEG' ? 'FAST' : 'NONE' // compression
    );

    // Step 6: Save PDF
    pdf.save(normalizedFileName);

    console.log(`[exportPdf] Successfully exported: ${normalizedFileName}`);
    return true;
  } catch (error) {
    console.error('[exportPdf] Failed to export PDF:', error);
    return false;
  } finally {
    // Notify finish
    onFinish?.();
  }
}

/**
 * Helper to get estimated PDF file dimensions for a given element
 * Useful for previewing or calculating optimal export settings
 * 
 * @param element - The HTML element to measure
 * @returns Estimated PDF dimensions in millimeters
 * 
 * @example
 * const dims = getEstimatedPdfDimensions(element);
 * console.log(`PDF will be ${dims.widthMm}mm × ${dims.heightMm}mm`);
 */
export function getEstimatedPdfDimensions(element: HTMLElement | null): {
  widthMm: number;
  heightMm: number;
  willFitOnePage: boolean;
} {
  if (!element) {
    return {
      widthMm: A4_LANDSCAPE_WIDTH_MM,
      heightMm: A4_LANDSCAPE_HEIGHT_MM,
      willFitOnePage: true,
    };
  }

  const rect = element.getBoundingClientRect();
  const aspectRatio = rect.height / rect.width;

  const widthMm = A4_LANDSCAPE_WIDTH_MM;
  const heightMm = widthMm * aspectRatio;
  const willFitOnePage = heightMm <= A4_LANDSCAPE_HEIGHT_MM;

  return {
    widthMm,
    heightMm,
    willFitOnePage,
  };
}

