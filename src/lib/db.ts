import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  __mongooseCache?: MongooseCache;
};

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/kanban";

/**
 * Get a cached Mongoose connection (survives HMR).
 * In production `MONGODB_URI` must be provided (Atlas / prod cluster).
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (globalForMongoose.__mongooseCache?.conn) {
    return globalForMongoose.__mongooseCache.conn;
  }
  if (!globalForMongoose.__mongooseCache) {
    globalForMongoose.__mongooseCache = { conn: null, promise: null };
  }
  if (!globalForMongoose.__mongooseCache.promise) {
    // First DB calls run before the connection is live: Mongoose buffers
    // commands and throws after bufferTimeoutMS (default 10s). The round-28e
    // incident (cold serverless + slow Atlas) hit exactly that throw.
    mongoose.set("bufferTimeoutMS", 25_000);
    globalForMongoose.__mongooseCache.promise = mongoose
      .connect(uri, {
        dbName: process.env.MONGODB_DB ?? "kanban",
        // Keep the serverless instance's pool small so N concurrent lambdas
        // never exhaust an Atlas M0 connection cap.
        serverSelectionTimeoutMS: 10_000,
        maxPoolSize: 10,
        maxIdleTimeMS: 300_000,
      })
      .then((m) => {
        globalForMongoose.__mongooseCache!.conn = m;
        return m;
      });
  }
  await globalForMongoose.__mongooseCache.promise;
  return globalForMongoose.__mongooseCache.conn!;
}
