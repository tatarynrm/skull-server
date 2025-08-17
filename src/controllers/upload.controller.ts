// import { Request, Response } from "express";

// export const uploadFiles = async (req: Request, res: Response) => {
//   const { company_id, type, truck_id } = req.body;
// console.log(req.body);

//   const files = req.files || [req.file];

//   if (!files || files.length === 0) {
//     res.status(400).json({ message: "No files uploaded" });
//     return;
//   }

//   const paths = Array.isArray(files)
//     ? files.map((file: any) => file.path)
//     : [files.path];

//   res.status(200).json({ message: "Files uploaded", paths });
//   return;
// };
