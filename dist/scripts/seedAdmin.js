"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
const seedAdmin = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("MONGO_URI is not defined in environment variables");
        }
        await mongoose_1.default.connect(mongoUri);
        console.log("Connected to MongoDB");
        // Admin user credentials
        const adminEmail = "hamza_loubani@admin.com";
        const adminPassword = "lo2005ha";
        const adminUsername = "hamza_loubani";
        // Check if admin already exists
        const existingAdmin = await User_1.default.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log("Admin user already exists with this email");
            console.log("Updating existing user to admin role...");
            existingAdmin.role = "admin";
            existingAdmin.password = adminPassword; // This will be hashed by pre-save hook
            await existingAdmin.save();
            console.log("Admin user updated successfully!");
            console.log(`Email: ${adminEmail}`);
            console.log(`Role: ${existingAdmin.role}`);
        }
        else {
            // Create new admin user
            const adminUser = new User_1.default({
                username: adminUsername,
                email: adminEmail,
                password: adminPassword, // Will be hashed automatically by pre-save hook
                role: "admin",
            });
            await adminUser.save();
            console.log("Admin user created successfully!");
            console.log(`Username: ${adminUsername}`);
            console.log(`Email: ${adminEmail}`);
            console.log(`Role: admin`);
        }
        // Disconnect from MongoDB
        await mongoose_1.default.disconnect();
        console.log("Disconnected from MongoDB");
        process.exit(0);
    }
    catch (error) {
        console.error("Error seeding admin user:", error);
        process.exit(1);
    }
};
seedAdmin();
