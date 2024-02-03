require("dotenv").config();
import express, { NextFunction, Request, Response } from "express";
export const app = express();

import cors from "cors";
import cookieParser from "cookie-parser";

// bosy parser
app.use(
  express.json({
    limit: "50mb",
  })
);

// cookieparser
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.ORIGIN,
  })
);

// testing route
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  return res.json({ message: "Test route working" });
});

// unknown/catch all route
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route ${req.originalUrl} not found`) as any;
  err.statusCode = 400;
  next(err);
});
