import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
     type: String,
     required: true,
     unique: true,
     lowercase: true,
     trim: true,
     match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"]
},
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
  },
  { timestamps: true } // createdAt & updatedAt
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.index({ email: 1 });

const User = mongoose.model("User", userSchema);

export default User;