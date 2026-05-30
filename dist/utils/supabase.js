"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToSupabase = exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "images";
if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing supabase role key!!");
}
if (!SUPABASE_URL) {
    throw new Error("Missing supabase url!!");
}
// Remove the unsupported `fetch` field from the options object:
exports.supabaseAdmin = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// Helper function to upload files to Supabase
const uploadToSupabase = async (file, folder = "products") => {
    const fileExt = file.originalname.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { data, error } = await exports.supabaseAdmin.storage
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
    const { data: urlData } = exports.supabaseAdmin.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(data.path);
    return urlData.publicUrl;
};
exports.uploadToSupabase = uploadToSupabase;
