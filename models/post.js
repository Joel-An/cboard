var mongoose = require('mongoose');
var Schema = mongoose.Schema;
 
 
var postSchema = new Schema({
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board' },

    title: { type: String, required: true },
    contents: { type: String, required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    commentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],

    date: {type: Date, default: Date.now()},
    isThisModified: {type: Boolean, default: false},
    modifiedDate: {type: Date},
    isPromoted: {type: Boolean, default: false},
    promotedDate: {type: Date},

    viewed: {type:Number, default: 0},
    
    like: {type:Number, default: 0},
    unLikes: {type:Number, default: 0}
});
 
module.exports = mongoose.model('Post', postSchema);