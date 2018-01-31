var mongoose = require("mongoose");

var cardSchema = mongoose.Schema({
  image: { type: String, required: true, unique: true },
  owner: { type: String, required: true}
});


var Card = mongoose.model("Card", cardSchema);
module.exports = Card;