// Image Compression Utility
// Resizes + re-encodes an image file to a compressed JPEG before it is uploaded to
// Supabase Storage, keeping payloads small while still legible for scorecard photos.

const ImageCompress = {
  DEFAULT_MAX_WIDTH: 1600,
  DEFAULT_QUALITY: 0.82,
  GALLERY_MAX_WIDTH: 1080,
  GALLERY_QUALITY: 0.7,
  GALLERY_TARGET_BYTES: 70 * 1024,
  GALLERY_MIN_WIDTH: 640,
  GALLERY_MIN_QUALITY: 0.4,

  /**
   * @param {File} file
   * @param {{ maxWidth?: number, quality?: number }} [options]
   * @returns {Promise<{ base64: string, mimeType: string }>} base64 has no data-URL prefix
   */
  compressImage: function(file, options) {
    const maxWidth = (options && options.maxWidth) || this.DEFAULT_MAX_WIDTH;
    const quality = (options && options.quality) != null ? options.quality : this.DEFAULT_QUALITY;

    return this._readFileAsDataUrl(file)
      .then((dataUrl) => this._drawResizedAndExport(dataUrl, maxWidth, quality))
      .catch((err) => {
        console.warn('ImageCompress: falling back to uncompressed file:', err);
        return this._fallbackUncompressed(file);
      });
  },

  /**
   * Gallery uploads: shrink until the JPEG is around 70KB (phone/tablet viewing).
   * @param {File} file
   * @param {{ targetBytes?: number, maxWidth?: number, quality?: number }} [options]
   * @returns {Promise<{ base64: string, mimeType: string, byteSize: number }>}
   */
  compressToTarget: function(file, options) {
    const targetBytes = (options && options.targetBytes) || this.GALLERY_TARGET_BYTES;
    let maxWidth = (options && options.maxWidth) || this.GALLERY_MAX_WIDTH;
    let quality = (options && options.quality) != null ? options.quality : this.GALLERY_QUALITY;
    const self = this;

    return this._readFileAsDataUrl(file).then(function attempt(dataUrl) {
      return self._drawResizedBlob(dataUrl, maxWidth, quality).then(function(blob) {
        if (blob.size <= targetBytes || (maxWidth <= self.GALLERY_MIN_WIDTH && quality <= self.GALLERY_MIN_QUALITY)) {
          return self._blobToBase64(blob).then(function(base64) {
            return { base64: base64, mimeType: "image/jpeg", byteSize: blob.size };
          });
        }
        if (quality > self.GALLERY_MIN_QUALITY) {
          quality = Math.max(self.GALLERY_MIN_QUALITY, Math.round((quality - 0.1) * 100) / 100);
        } else {
          maxWidth = Math.max(self.GALLERY_MIN_WIDTH, Math.round(maxWidth * 0.85));
        }
        return attempt(dataUrl);
      });
    }).catch(function(err) {
      console.warn("ImageCompress: gallery target compress failed, using single-pass:", err);
      return self.compressImage(file, { maxWidth: maxWidth, quality: quality }).then(function(result) {
        return {
          base64: result.base64,
          mimeType: result.mimeType,
          byteSize: Math.ceil((result.base64.length * 3) / 4),
        };
      });
    });
  },

  _fallbackUncompressed: function(file) {
    return this._readFileAsDataUrl(file).then((dataUrl) => {
      const parts = dataUrl.split(',');
      const mimeMatch = /^data:([^;]+);base64$/.exec(parts[0]);
      return {
        base64: parts[1] || '',
        mimeType: (mimeMatch && mimeMatch[1]) || file.type || 'image/jpeg',
      };
    });
  },

  _readFileAsDataUrl: function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  _drawResizedAndExport: function(dataUrl, maxWidth, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / (img.width || maxWidth));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        this._canvasToBlob(canvas, quality).then((blob) => {
          return this._blobToBase64(blob).then((base64) => {
            resolve({ base64, mimeType: 'image/jpeg' });
          });
        }, reject);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = dataUrl;
    });
  },

  _drawResizedBlob: function(dataUrl, maxWidth, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / (img.width || maxWidth));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        this._canvasToBlob(canvas, quality).then(resolve, reject);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = dataUrl;
    });
  },

  _canvasToBlob: function(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob failed'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        quality,
      );
    });
  },

  _blobToBase64: function(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const commaIdx = result.indexOf(',');
        resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
      };
      reader.onerror = () => reject(reader.error || new Error('Failed to encode blob'));
      reader.readAsDataURL(blob);
    });
  },
};
