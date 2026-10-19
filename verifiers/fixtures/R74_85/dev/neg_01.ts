import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
});

const User = mongoose.model("User", UserSchema);

export async function saveProfile(name: string, email: string) {
  await mongoose.connect(process.env.MONGO_URL ?? "mongodb://localhost:27017/app");
  const user = new User({ name, email });
  return user.save();
}
