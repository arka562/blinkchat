import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    image: {
      type: String,
    },
    conversationId: {
      type: String,
      index: true,
    },
    seen: {
  type: Boolean,
  default: false,
},
seenAt: {
  type: Date,
},
  },
  { timestamps: true }
);

// Ensure message has content
messageSchema.pre("validate", function (next) {
  if (!this.text && !this.image) {
    return next(new Error("Message must have text or image"));
  }
  next();
});

// Generate conversationId
messageSchema.pre("save", function (next) {
  if (this.senderId && this.receiverId) {
    const ids = [this.senderId.toString(), this.receiverId.toString()].sort();
    this.conversationId = ids.join("_");
  }
  next();
});

// Index for fast chat retrieval
messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;