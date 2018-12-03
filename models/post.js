var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

var postSchema = new Schema({
  boardInfo: { type: ObjectId, ref: "Board" },

  title: { type: String, required: true },
  contents: { type: String, required: true },
  authorInfo: { _id: { type: ObjectId, ref: "User" }, name: { type: String } },

  date: { type: Date, default: Date.now() },
  isThisModified: { type: Boolean, default: false },
  modifiedDate: { type: Date },
  isPromoted: { type: Boolean, default: false },
  promotedDate: { type: Date },

  viewed: { type: Number, default: 0 },

  like: { type: Number, default: 0 },
  unLikes: { type: Number, default: 0 }
});

postSchema.methods.isValidAuthor = function(id) {
  return this.authorInfo.equals(id);
};

module.exports = mongoose.model("Post", postSchema);
