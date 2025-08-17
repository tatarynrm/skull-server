import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadPhotoToCloudinary(fileUrl: string, userId: number) {
  try {
    const result = await cloudinary.uploader.upload(fileUrl, {
      folder: `profiles/${userId}`,
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return null;
  }
}
export const deletePhotoFromCloudinary = async (url: string) => {
  try {
    // Витягуємо public_id з URL
    // Приклад URL: https://res.cloudinary.com/<cloud_name>/image/upload/v1692300000/folder_name/photo.jpg
    const urlParts = url.split("/");
    const fileName = urlParts[urlParts.length - 1]; // photo.jpg
    const folderAndFile = urlParts.slice(7).join("/"); // folder_name/photo.jpg або просто photo.jpg
    const publicId = folderAndFile.replace(/\.[^/.]+$/, ""); // видаляємо розширення

    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (err) {
    console.error("Error deleting photo from Cloudinary:", err);
    throw err;
  }
};