// NEW: memoryStorage version
import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    (cb as any)(new Error("Only image files are allowed!"), false);
  }
};

export const upload = multer({ storage, fileFilter });

// Single file upload middleware
export const uploadSingle = upload.single("image");

//(cb as any)
