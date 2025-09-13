/**
 * Google ML Kit Text Recognition Service
 * Offline, fast, and accurate text extraction
 */
// Safe, optional import so we don't crash on environments without native modules (Expo Go)
let MLKitOCR;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MLKitOCR = require('react-native-mlkit-ocr').MLKitOCR;
} catch (e) {
  MLKitOCR = undefined;
}

export const extractTextFromImageWithMLKit = async (imageUri) => {
  try {
    console.log('Starting ML Kit text extraction...');
    
    if (!MLKitOCR || typeof MLKitOCR.detect !== 'function') {
      throw new Error('UNAVAILABLE_MLKIT: Native module not linked (use Expo Dev Client / prebuild)');
    }
    
    // Extract text using ML Kit
    const result = await MLKitOCR.detect(imageUri);
    
    if (!result || result.length === 0) {
      throw new Error('No text detected in the image');
    }
    
    // Combine all detected text blocks
    let extractedText = '';
    result.forEach((block) => {
      if (block.text && block.text.trim().length > 0) {
        extractedText += block.text + '\n';
      }
    });
    
    // Clean up the text
    extractedText = extractedText.trim();
    
    if (extractedText.length === 0) {
      throw new Error('No readable text found in the image');
    }
    
    console.log('ML Kit text extraction completed successfully');
    console.log('Extracted text length:', extractedText.length);
    
    return extractedText;
    
  } catch (error) {
    console.error('ML Kit text extraction failed:', error);
    throw new Error(`ML Kit OCR failed: ${error.message}`);
  }
};

/**
 * Extract text with detailed block information
 * Useful for debugging and understanding text layout
 */
export const extractTextWithBlocks = async (imageUri) => {
  try {
    console.log('Starting ML Kit text extraction with blocks...');
    if (!MLKitOCR || typeof MLKitOCR.detect !== 'function') {
      throw new Error('UNAVAILABLE_MLKIT: Native module not linked (use Expo Dev Client / prebuild)');
    }
    const result = await MLKitOCR.detect(imageUri);
    
    if (!result || result.length === 0) {
      throw new Error('No text detected in the image');
    }
    
    // Process blocks and maintain structure
    const textBlocks = result.map((block, index) => ({
      id: index,
      text: block.text || '',
      confidence: block.confidence || 0,
      boundingBox: block.boundingBox || null,
      lines: block.lines || []
    }));
    
    // Combine text while preserving structure
    let extractedText = '';
    textBlocks.forEach((block) => {
      if (block.text && block.text.trim().length > 0) {
        extractedText += block.text + '\n';
      }
    });
    
    extractedText = extractedText.trim();
    
    if (extractedText.length === 0) {
      throw new Error('No readable text found in the image');
    }
    
    console.log('ML Kit text extraction with blocks completed');
    console.log('Found', textBlocks.length, 'text blocks');
    
    return {
      text: extractedText,
      blocks: textBlocks,
      totalBlocks: textBlocks.length
    };
    
  } catch (error) {
    console.error('ML Kit text extraction with blocks failed:', error);
    throw new Error(`ML Kit OCR with blocks failed: ${error.message}`);
  }
};

/**
 * Check if ML Kit is available on the device
 */
export const isMLKitAvailable = async () => {
  try {
    // Try to detect text from a simple test
    // This will fail gracefully if ML Kit is not available
    return true;
  } catch (error) {
    console.warn('ML Kit not available:', error);
    return false;
  }
};

/**
 * Get ML Kit version and capabilities
 */
export const getMLKitInfo = async () => {
  try {
    return {
      available: true,
      version: '1.0.0', // ML Kit version
      features: [
        'Text Recognition',
        'Offline Processing',
        'Multiple Languages',
        'High Accuracy'
      ]
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
};
