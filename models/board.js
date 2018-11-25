var mongoose = require('mongoose');
var Schema = mongoose.Schema;
 
 
var boardSchema = new Schema({
    name_kor: { type: String, required: true },
    name_eng: { type: String, required: true },
    boardType: {type: String, enum:['Normal','Best','Admin'], default: 'Normal'}
});
 
module.exports = mongoose.model('Board', boardSchema);