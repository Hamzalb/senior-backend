"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// --- Imports ---
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = require("http");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const barterRoutes_1 = __importDefault(require("./routes/barterRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const Category_1 = __importDefault(require("./models/Category"));
const errorMiddleware_1 = require("./middleware/errorMiddleware");
const socket_1 = require("./socket");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// --- Middleware Setup ---
const FRONTEND_URLS = [
    "https://senior-frontend-master.vercel.app",
    "https://senior-frontend-eta.vercel.app",
    "http://localhost:3000",
    "http://localhost:5050",
    "http://192.168.1.108:3000",
    "http://192.168.1.108:5050",
];
app.use((0, cors_1.default)({
    origin: (incomingOrigin, callback) => {
        // allow requests with no origin (mobile apps, curl, Postman)
        if (!incomingOrigin)
            return callback(null, true);
        // allow any local network IP (192.168.x.x or 10.x.x.x) for development
        const isLocalNetwork = /^http:\/\/(192\.168\.|10\.)[\d.]+:\d+$/.test(incomingOrigin);
        if (FRONTEND_URLS.includes(incomingOrigin) || isLocalNetwork) {
            callback(null, incomingOrigin);
        }
        else {
            callback(new Error(`CORS policy: origin ${incomingOrigin} not allowed`), false);
        }
    },
    credentials: true, // send Access-Control-Allow-Credentials: true
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
        // send Access-Control-Allow-Headers
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
    ],
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// --- Health Check Route ---
app.get("/", (req, res) => {
    res.send("Backend is running ✨");
});
// 3) Your routes (MUST come *after* the static line)
app.use("/api/barter", barterRoutes_1.default);
app.use("/api/auth", authRoutes_1.default);
app.use("/api/users", userRoutes_1.default);
app.use("/api/admin", adminRoutes_1.default);
app.use("/api/products", productRoutes_1.default);
app.use("/api/notifications", notificationRoutes_1.default);
app.use("/api/messages", messageRoutes_1.default);
app.use("/api/categories", categoryRoutes_1.default);
// 4) Error handlers
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
// --- MongoDB Connection & Server Start ---
const PORT = Number(process.env.PORT) || 5001;
mongoose_1.default
    .connect(process.env.MONGO_URI)
    .then(async () => {
    console.log("✅ MongoDB connected");
    // Mark all built-in categories as isDefault: true
    const DEFAULT_CATEGORIES = ["Electronics", "Clothing", "Books", "Toys", "Home", "Automobiles", "Other"];
    const result = await Category_1.default.updateMany({ name: { $in: DEFAULT_CATEGORIES } }, { $set: { isDefault: true } });
    console.log(`✅ Marked ${result.modifiedCount} categories as built-in`);
    // Initialize Socket.io
    (0, socket_1.initSocket)(httpServer);
    console.log("🔌 Socket.io initialized");
    // Start server with HTTP server (required for Socket.io)
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
})
    .catch((err) => console.error("❌ MongoDB connection error:", err));
