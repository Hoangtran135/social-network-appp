import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/social-network-app';
  await mongoose.connect(uri, {
    // Mongoose's default (100) is already reasonable, but pin it explicitly so it's a
    // deliberate, tunable number rather than an implicit default — raise it (and make sure
    // MongoDB's own max connection limit accommodates it) if request volume outgrows this.
    maxPoolSize: Number(process.env.MONGO_POOL_SIZE) || 100,
  });
  console.log(`==> Connected to MongoDB at ${uri}`);
}
