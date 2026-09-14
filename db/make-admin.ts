import mongoose from 'mongoose';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: tsx db/make-admin.ts <email>');
    process.exit(1);
  }
  await mongoose.connect('mongodb://127.0.0.1:27017/social-network-app');
  const result = await mongoose.connection.db!.collection('users').updateOne(
    { email: email.toLowerCase() },
    { $set: { role: 'admin' } }
  );
  console.log(result.matchedCount ? `${email} is now admin` : `No user found with email ${email}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
