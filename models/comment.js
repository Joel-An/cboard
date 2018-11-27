var mongoose = require('mongoose');
var Schema = mongoose.Schema;
 
 
var commentSchema = new Schema({
    postInfo: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },

    contents: { type: String, required: true },
    authorInfo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    commentInfo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],

    date: {type: Date, default: Date.now()},
    isThisModified: {type: Boolean, default: false},
    modifiedDate: {type: Date},

    like: {type:Number, default: 0},
    unLikes: {type:Number, default: 0},

    isDeleted: {type: Boolean, default: false}
});

commentSchema.methods.isValidAuthor = function(id) {
    return this.authorInfo.equals(id);
};
 
module.exports = mongoose.model('Comment', commentSchema);