"use strict";
// Diagnostic script to test Supabase bucket configuration
// Run with: npx ts-node src/scripts/testSupabaseBucket.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log("=== Supabase Configuration Test ===\n");
console.log("SUPABASE_URL:", SUPABASE_URL);
console.log("SERVICE_KEY (first 20 chars):", SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + "...");
console.log("");
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
async function testSupabaseBucket() {
    try {
        // 1. List all buckets
        console.log("1. Listing all buckets...");
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        if (bucketError) {
            console.error("   ❌ Error listing buckets:", bucketError);
        }
        else {
            console.log("   ✅ Found", buckets?.length || 0, "buckets:");
            buckets?.forEach((b) => {
                console.log(`      - ${b.name} (public: ${b.public})`);
            });
        }
        console.log("");
        // 2. Check if 'sineor' bucket exists
        console.log("2. Checking if 'sineor' bucket exists...");
        const sineorBucket = buckets?.find((b) => b.name === "sineor");
        if (sineorBucket) {
            console.log("   ✅ 'sineor' bucket exists");
            console.log("   Public:", sineorBucket.public);
        }
        else {
            console.log("   ❌ 'sineor' bucket NOT FOUND!");
            console.log("   Available buckets:", buckets?.map((b) => b.name).join(", "));
        }
        console.log("");
        // 3. List files in 'sineor/products' folder
        console.log("3. Listing files in 'sineor/products'...");
        const { data: files, error: listError } = await supabase.storage
            .from("sineor")
            .list("products", { limit: 10 });
        if (listError) {
            console.error("   ❌ Error listing files:", listError);
        }
        else {
            console.log("   ✅ Found", files?.length || 0, "files:");
            files?.forEach((f) => {
                console.log(`      - ${f.name} (${f.metadata?.size || 'unknown size'})`);
            });
        }
        console.log("");
        // 4. Test public URL generation
        console.log("4. Testing public URL generation...");
        if (files && files.length > 0) {
            const testFile = files[0];
            const { data: urlData } = supabase.storage
                .from("sineor")
                .getPublicUrl(`products/${testFile.name}`);
            console.log("   Generated URL:", urlData.publicUrl);
            // 5. Test if URL is accessible
            console.log("\n5. Testing if URL is accessible...");
            try {
                const response = await fetch(urlData.publicUrl);
                console.log("   Status:", response.status, response.statusText);
                console.log("   Content-Type:", response.headers.get("content-type"));
                if (response.ok) {
                    console.log("   ✅ Image is accessible!");
                }
                else {
                    console.log("   ❌ Image returned non-OK status");
                }
            }
            catch (fetchError) {
                console.log("   ❌ Fetch error:", fetchError);
            }
        }
        else {
            console.log("   No files to test URL generation");
        }
        console.log("");
        // 6. Test upload a small test image
        console.log("6. Testing upload to 'sineor' bucket...");
        const testImageBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
        const testPath = `products/test-${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("sineor")
            .upload(testPath, testImageBuffer, {
            contentType: "image/png",
            upsert: false,
        });
        if (uploadError) {
            console.error("   ❌ Upload error:", uploadError);
        }
        else {
            console.log("   ✅ Upload successful!");
            console.log("   Path:", uploadData?.path);
            // Get public URL for uploaded test file
            const { data: testUrlData } = supabase.storage
                .from("sineor")
                .getPublicUrl(testPath);
            console.log("   Public URL:", testUrlData.publicUrl);
            // Clean up - delete test file
            const { error: deleteError } = await supabase.storage
                .from("sineor")
                .remove([testPath]);
            if (deleteError) {
                console.log("   ⚠️ Could not delete test file:", deleteError);
            }
            else {
                console.log("   ✅ Test file cleaned up");
            }
        }
        console.log("");
        // 7. Summary
        console.log("=== Summary ===");
        console.log("Bucket 'sineor' exists:", !!sineorBucket);
        console.log("Bucket is public:", sineorBucket?.public || false);
        console.log("Files in bucket:", files?.length || 0);
        console.log("Upload works:", !uploadError);
        console.log("");
        if (!sineorBucket) {
            console.log("⚠️ ACTION REQUIRED: Create 'sineor' bucket in Supabase Dashboard");
            console.log("   1. Go to: https://supabase.com/dashboard/project/hxrhbfrjlhgpimrngalp/storage/buckets");
            console.log("   2. Click 'Create a new bucket'");
            console.log("   3. Name it 'sineor'");
            console.log("   4. Enable 'Public bucket'");
        }
        else if (!sineorBucket.public) {
            console.log("⚠️ ACTION REQUIRED: Make 'sineor' bucket public");
            console.log("   1. Go to bucket settings");
            console.log("   2. Enable 'Public bucket' option");
        }
    }
    catch (error) {
        console.error("Unexpected error:", error);
    }
}
testSupabaseBucket();
