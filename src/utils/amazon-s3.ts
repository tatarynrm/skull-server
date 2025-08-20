import { S3Client, ListBucketsCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const bucketName = process.env.BUCKET_NAME!;
const bucketRegion = process.env.BUCKET_REGION!;
const bucketAccessKey = process.env.AMAZON_S3_ACCESS_KEY!;
const bucketSecretKey = process.env.AMAZON_S3_SECRET_KEY!;

export const s3 = new S3Client({
  credentials: {
    accessKeyId: bucketAccessKey,
    secretAccessKey: bucketSecretKey,
  },
  region:bucketRegion
});

export async function uploadPhotoToS3(fileUrl: string, userId: number, fileName?: string) {
  try {
    // Завантажуємо файл з Telegram
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Failed to fetch file from Telegram");

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Генеруємо ім’я файлу
    const key = `user-uploads/${userId}/${fileName || Date.now()}.jpg`;

    // Завантажуємо на S3
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: "image/jpeg"
      })
    );

    // Повертаємо URL
    return `https://${bucketName}.s3.${process.env.BUCKET_REGION}.amazonaws.com/${key}`;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export const deletePhotoFromS3 = async (url: string) => {
  try {
    // Витягуємо Key з URL
    // URL: https://YOUR_BUCKET_NAME.s3.YOUR_REGION.amazonaws.com/user-uploads/USER_ID/photo.jpg
    const urlObj = new URL(url);
    const key = urlObj.pathname.slice(1); // прибираємо початковий "/"

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const result = await s3.send(command);
    return result; // AWS повертає metadata видалення
  } catch (err) {
    console.error("Error deleting photo from S3:", err);
    throw err;
  }
};