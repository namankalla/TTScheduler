const vision = require('@google-cloud/vision');
const { storage } = require('../config/firebaseConfig');

class OCRService {
  constructor() {
    // Initialize Google Cloud Vision client
    this.client = new vision.ImageAnnotatorClient();
  }

  /**
   * Extract text from uploaded image using Google Cloud Vision API
   * @param {Buffer} imageBuffer - Image buffer data
   * @param {string} fileName - Original filename
   * @returns {Promise<string>} Extracted text content
   */
  async extractTextFromImage(imageBuffer, fileName) {
    try {
      console.log(`Starting OCR processing for file: ${fileName}`);

      // Upload image to Firebase Storage temporarily
      const bucket = storage.bucket();
      const file = bucket.file(`temp-ocr/${Date.now()}-${fileName}`);
      
      await file.save(imageBuffer, {
        metadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=3600'
        }
      });

      console.log('Image uploaded to storage, starting OCR...');

      // Perform OCR on the image
      const [result] = await this.client.textDetection({
        image: { content: imageBuffer }
      });

      const detections = result.textAnnotations;
      
      if (!detections || detections.length === 0) {
        throw new Error('No text detected in the image');
      }

      const extractedText = detections[0].description;
      console.log('OCR completed successfully');

      // Clean up temporary file
      await file.delete().catch(err => 
        console.warn('Failed to delete temporary file:', err.message)
      );

      return extractedText;

    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  /**
   * Preprocess image for better OCR results
   * @param {Buffer} imageBuffer - Original image buffer
   * @returns {Buffer} Processed image buffer
   */
  async preprocessImage(imageBuffer) {
    // In a production app, you might want to add image preprocessing
    // like contrast enhancement, rotation correction, etc.
    // For now, we'll return the original buffer
    return imageBuffer;
  }

  /**
   * Validate image format and size
   * @param {Buffer} imageBuffer - Image buffer to validate
   * @param {string} mimetype - MIME type of the image
   * @returns {boolean} True if valid
   */
  validateImage(imageBuffer, mimetype) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(mimetype)) {
      throw new Error('Invalid image format. Only JPEG and PNG are supported.');
    }

    if (imageBuffer.length > maxSize) {
      throw new Error('Image too large. Maximum size is 10MB.');
    }

    return true;
  }
}

module.exports = new OCRService();