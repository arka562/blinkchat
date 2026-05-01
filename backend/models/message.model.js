import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    text: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    image: {
      type: String,
      default: null,
    },

    // Conversation grouping
    conversationId: {
      type: String,
      index: true,
    },

    // ✅ Single source of truth
    isSeen: {
      type: Boolean,
      default: false,
      index: true,
    },

    seenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ================= VALIDATION =================
messageSchema.pre("validate", function (next) {
  if (!this.text && !this.image) {
    return next(new Error("Message must have text or image"));
  }
  next();
});

// ================= CONVERSATION ID =================
messageSchema.pre("save", function (next) {
  if (this.senderId && this.receiverId) {
    const ids = [
      this.senderId.toString(),
      this.receiverId.toString(),
    ].sort();

    this.conversationId = ids.join("_");
  }
  next();
});

// ================= INDEXES =================
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, isSeen: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;