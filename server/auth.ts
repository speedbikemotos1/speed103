import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { storage } from "./storage";
import { User as UserType } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends UserType {}
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "speed-bike-secret",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 24 * 60 * 60 * 1000, // prune expired entries daily
    }),
    cookie: {
      secure: false, 
      maxAge: 30 * 24 * 60 * 60 * 1000, 
      sameSite: "lax",
    },
  };

  app.use(session(sessionSettings));
  
  // Disable trust proxy if causing issues, or ensure it's set correctly
  // Replit often uses 'loopback' or 1
  app.set("trust proxy", true);

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`Login failed: user '${username}' not found in DB`);
          return done(null, false, { message: "Utilisateur non trouvé" });
        }
        
        // Match exactly Karim/karim or Yassin/yassin
        // The user wants to login using ONLY the username.
        // For development/usability, we accept the username itself as the password if they provide it, 
        // OR we just allow them in because they requested username-only login.
        // To be safe and meet the user's specific "username only" request:
        console.log(`Login successful for user: ${username} (Username-only login enabled)`);
        return done(null, user);
      } catch (err) {
        console.error("Login error:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info.message });
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
