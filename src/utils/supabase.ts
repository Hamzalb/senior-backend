import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "images";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing supabase role key!!");
}

if (!SUPABASE_URL) {
  throw new Error("Missing supabase url!!");
}

// Remove the unsupported `fetch` field from the options object:
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to upload files to Supabase
export const uploadToSupabase = async (
  file: Express.Multer.File,
  folder: string = "products"
): Promise<string> => {
  const fileExt = file.originalname.split(".").pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabaseAdmin.storage
    .from(SUPABASE_BUCKET)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
};
