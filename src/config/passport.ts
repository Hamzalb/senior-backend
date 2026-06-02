import dotenv from "dotenv";
dotenv.config();
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "crypto";
import User from "../models/User";

const CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  `${process.env.BACKEND_URL || "https://senior-backend-e4gw.onrender.com"}/api/auth/google/callback`;

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:  CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // 1) existing Google user
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user as any);

        const email = profile.emails?.[0]?.value;

        // 2) link to existing account that has the same email
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            (user as any).googleId   = profile.id;
            (user as any).isVerified = true;
            await user.save();
            return done(null, user as any);
          }
        }

        // 3) create brand-new user (Google users get a random password they never use)
        const username =
          profile.displayName?.replace(/\s+/g, "") ||
          email?.split("@")[0] ||
          `user_${profile.id.slice(0, 6)}`;

        const newUser = await User.create({
          googleId:   profile.id,
          username,
          email:      email || `${profile.id}@google.user`,
          password:   crypto.randomBytes(20).toString("hex"), // hashed by pre-save hook
          avatar:     profile.photos?.[0]?.value,
          isVerified: true,
        });

        return done(null, newUser as any);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user as any);
  } catch (err) {
    done(err);
  }
});

export default passport;
