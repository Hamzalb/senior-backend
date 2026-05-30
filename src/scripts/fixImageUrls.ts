// Script to fix existing product image URLs in MongoDB
// Run with: npx ts-node src/scripts/fixImageUrls.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI!;

// Define the Product schema
const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  images: [String],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isAvailable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const Product = mongoose.model('Item', productSchema);

async function fixImageUrls() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all products with incorrect image URLs
    const products = await Product.find({
      images: { $regex: /\/object\/public\/images\// }
    });

    console.log(`Found ${products.length} products with incorrect image URLs`);

    let updatedCount = 0;

    for (const product of products) {
      const fixedImages = product.images.map((url: string) => {
        // Replace /images/ with /sineor/ in the URL
        return url.replace(
          '/storage/v1/object/public/images/',
          '/storage/v1/object/public/sineor/'
        );
      });

      // Check if any URLs were actually changed
      const hasChanges = fixedImages.some((url: string, index: number) => 
        url !== product.images[index]
      );

      if (hasChanges) {
        product.images = fixedImages;
        await product.save();
        updatedCount++;
        console.log(`Updated product: ${product.title}`);
        console.log(`  Old URL: ${product.images[0]?.replace('/sineor/', '/images/')}`);
        console.log(`  New URL: ${product.images[0]}`);
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} products`);
    
    // Also show products that might have other URL issues
    const allProducts = await Product.find({});
    console.log(`\nTotal products in database: ${allProducts.length}`);
    
    // Show sample URLs for verification
    const sampleProducts = await Product.find({}).limit(3);
    console.log('\nSample product URLs:');
    sampleProducts.forEach((p: any) => {
      console.log(`  ${p.title}: ${p.images?.[0] || 'No image'}`);
    });

  } catch (error) {
    console.error('Error fixing image URLs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixImageUrls();
