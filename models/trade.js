var mongoose = require("mongoose");

var tradeSchema = mongoose.Schema({
  initiator: { type: String, required: true},
  recipient: { type: String, required: true},
  iCard: { type: String, required: true},
  rCard: { type: String, required: true},
  iCardImg: { type: String, required: true},
  rCardImg: { type: String, required: true}
});


var Trade = mongoose.model("Trade", tradeSchema);
module.exports = Trade;