import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImageToCloudinary = async (file: File, folder: string): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `shopping/${folder}`,
          resource_type: 'image',
          public_id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error('Upload failed'));
          }
        }
      ).end(buffer);
    });
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

export const deleteImageFromCloudinary = async (imageUrl: string): Promise<void> => {
  try {
    // Extract public_id from the Cloudinary URL
    const publicIdMatch = imageUrl.match(/\/v\d+\/(.+)\.[a-zA-Z]+$/);
    if (!publicIdMatch) {
      throw new Error('Invalid Cloudinary URL format');
    }

    const publicId = publicIdMatch[1];

    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          console.error('Cloudinary delete error:', error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};