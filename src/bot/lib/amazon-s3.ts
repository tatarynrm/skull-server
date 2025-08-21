import { S3Client, ListBucketsCommand, PutObjectCommand, DeleteObjectCommand,DeleteObjectsCommand, ListObjectsV2Command, ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { pool } from "../../db/pool";



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
  console.log(fileUrl,'FILE URL');
  
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

async function listAllKeys(bucketName: string): Promise<string[]> {
  let keys: string[] = [];
  let continuationToken: string | undefined = undefined;

  do {
    const response: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      })
    );

    const batchKeys = response.Contents?.map((obj) => obj.Key as string) || [];
    keys.push(...batchKeys);

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}
async function getPhotoKeysFromDb() {
  const res = await pool.query("SELECT url FROM tg_profile_photos");
  // Витягуємо з URL тільки ключ (наприклад "uploads/user1/photo1.jpg")
  return res.rows.map((row) => row.url.replace(/^https?:\/\/.*?\/\//, "").split("/").slice(1).join("/"));
}

async function findUnusedKeys(bucket: string) {
  const [allKeys, dbKeys] = await Promise.all([
    listAllKeys(bucket),
    getPhotoKeysFromDb(),
  ]);

  const dbKeySet = new Set(dbKeys);
  return allKeys.filter((key) => !dbKeySet.has(key));
}




async function deleteUnused(bucket: string) {
  const unusedKeys = await findUnusedKeys(bucket);

  if (unusedKeys.length === 0) {
    console.log("Немає непотрібних фото 🚀");
    return;
  }

  // Видаляємо пачками по 1000 (обмеження Amazon)
  for (let i = 0; i < unusedKeys.length; i += 1000) {
    const chunk = unusedKeys.slice(i, i + 1000);

    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: chunk.map((key) => ({ Key: key })),
        },
      })
    );
  }

  console.log(`Видалено ${unusedKeys.length} фото 🗑️`);
}


export async function deleteUserPhotos(userId: number) {
  const prefix = `user-uploads/${userId}/`;

  let continuationToken: string | undefined = undefined;
  let keysToDelete: string[] = [];

  do {
    const response: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix, // фільтр тільки для цього юзера
        ContinuationToken: continuationToken,
      })
    );

    const batchKeys = response.Contents?.map((obj) => obj.Key as string) || [];
    keysToDelete.push(...batchKeys);

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  if (keysToDelete.length === 0) {
    console.log(`У юзера ${userId} немає фото`);
    return;
  }

  // Видаляємо пачками по 1000
  for (let i = 0; i < keysToDelete.length; i += 1000) {
    const chunk = keysToDelete.slice(i, i + 1000);

    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: chunk.map((key) => ({ Key: key })),
        },
      })
    );
  }

  console.log(`Видалено ${keysToDelete.length} фото користувача ${userId} 🗑️`);
}
export async function deleteUnusedUserPhotos(userId: number) {
  const prefix = `user-uploads/${userId}/`;

  const [allKeys, dbKeys] = await Promise.all([
    listAllKeys(bucketName).then(keys => keys.filter(k => k.startsWith(prefix))),
    getPhotoKeysFromDb(), // витягує ключі з БД
  ]);

  const dbKeySet = new Set(dbKeys);
  const unusedKeys = allKeys.filter((key) => !dbKeySet.has(key));

  if (unusedKeys.length === 0) {
    console.log(`У юзера ${userId} немає зайвих фото 🚀`);
    return;
  }

  for (let i = 0; i < unusedKeys.length; i += 1000) {
    const chunk = unusedKeys.slice(i, i + 1000);

    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: { Objects: chunk.map((key) => ({ Key: key })) },
      })
    );
  }

  console.log(`Видалено ${unusedKeys.length} непотрібних фото користувача ${userId} 🗑️`);
}


export async function cleanupFolder(bucketName: string, folder: string, keepFiles: string[]) {
  // 1. Отримати всі об'єкти в папці
  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: folder, // наприклад "users/123/photos/"
  });
  const listResponse = await s3.send(listCommand);

  const allKeys = (listResponse.Contents || []).map(obj => obj.Key!);

  // 2. Знайти ті, яких немає в списку keepFiles
  const keysToDelete = allKeys.filter(key => !keepFiles.includes(key));

  if (keysToDelete.length === 0) {
    console.log("Немає що видаляти");
    return;
  }

  // 3. Видалити зайві
  const deleteCommand = new DeleteObjectsCommand({
    Bucket: bucketName,
    Delete: {
      Objects: keysToDelete.map(Key => ({ Key })),
    },
  });

  await s3.send(deleteCommand);
  console.log(`Видалено:`, keysToDelete);
}