// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { v4 as uuidv4 } from "uuid";
// import path from "path";
// import dotenv from "dotenv";
// dotenv.config();

// const s3 = new S3Client({
//   region: process.env.AWS_REGION!,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
//   },
// });

// export const uploadFileToS3 = async (file: Express.Multer.File) => {
//   const fileExt = path.extname(file.originalname);
//   const key = `uploads/${uuidv4()}${fileExt}`;

//   const uploadParams = {
//     Bucket: process.env.AWS_BUCKET_NAME!,
//     Key: key,
//     Body: file.buffer,
//     ContentType: file.mimetype,
//   };

//   await s3.send(new PutObjectCommand(uploadParams));

//   return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
// };
