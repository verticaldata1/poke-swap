var mongoose = require("mongoose");

var cardSchema = mongoose.Schema({
  owner: { type: String, required: true},
  image: { type: String, required: true, unique: true }  
});


var Card = mongoose.model("Card", cardSchema);
module.exports = Card;