const cloudinary = require("cloudinary").v2;

class CloudinaryService {
  constructor() {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new Error("Cloudinary credentials are required");
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(buffer, options = {}) {
    try {
      const defaultOptions = {
        resource_type: "image",
        folder: "smarteats",
        transformation: [
          { width: 800, height: 600, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      };

      const uploadOptions = { ...defaultOptions, ...options };

      return new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(uploadOptions, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          })
          .end(buffer);
      });
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new Error("Failed to upload image");
    }
  }

  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error("Cloudinary delete error:", error);
      throw new Error("Failed to delete image");
    }
  }

  getOptimizedUrl(publicId, transformations = {}) {
    const defaultTransformations = {
      quality: "auto",
      fetch_format: "auto",
    };

    const finalTransformations = {
      ...defaultTransformations,
      ...transformations,
    };

    return cloudinary.url(publicId, finalTransformations);
  }

  getImageSizes(publicId) {
    return {
      thumbnail: this.getOptimizedUrl(publicId, {
        width: 150,
        height: 150,
        crop: "fill",
      }),
      small: this.getOptimizedUrl(publicId, {
        width: 300,
        height: 200,
        crop: "fill",
      }),
      medium: this.getOptimizedUrl(publicId, {
        width: 600,
        height: 400,
        crop: "limit",
      }),
      large: this.getOptimizedUrl(publicId, {
        width: 1200,
        height: 800,
        crop: "limit",
      }),
      original: this.getOptimizedUrl(publicId),
    };
  }
}

module.exports = new CloudinaryService();
