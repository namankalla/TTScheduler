/**
 * OCR.space API Service
 * Free OCR service for extracting text from images
 */

const OCR_SPACE_API_KEY = 'K84357671688957';
const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';

export const extractTextFromImage = async (imageUri) => {
  try {
    console.log('Starting OCR.space text extraction...');

    // Convert image to base64
    const base64Image = await convertImageToBase64(imageUri);
    
    // Prepare form data
    const formData = new FormData();
    formData.append('apikey', OCR_SPACE_API_KEY);
    formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy

    // Make API request
    const response = await fetch(OCR_SPACE_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = await response.json();

    if (result.IsErroredOnProcessing) {
      throw new Error(`OCR Error: ${result.ErrorMessage}`);
    }

    if (!result.ParsedResults || result.ParsedResults.length === 0) {
      throw new Error('No text detected in the image');
    }

    const extractedText = result.ParsedResults[0].ParsedText;
    console.log('OCR extraction completed successfully');
    
    return extractedText.trim();

  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw new Error(`OCR failed: ${error.message}`);
  }
};

/**
 * Convert image URI to base64
 */
const convertImageToBase64 = async (imageUri) => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error(`Failed to convert image to base64: ${error.message}`);
  }
};

/**
 * Validate OCR.space API key
 */
export const validateOCRAPIKey = async () => {
  try {
    const formData = new FormData();
    formData.append('apikey', OCR_SPACE_API_KEY);
    formData.append('base64Image', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A');
    
    const response = await fetch(OCR_SPACE_URL, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    return !result.IsErroredOnProcessing;
  } catch (error) {
    return false;
  }
};
