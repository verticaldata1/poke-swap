var express = require('express');
var path = require("path");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var passport = require("passport");
var flash = require("connect-flash");
var fetch = require("node-fetch");
var setUpPassport = require("./setuppassport");
var authRouter = require("./routes/authRoute.js");
var User = require("./models/user");
var Card = require("./models/card");
var Trade = require("./models/trade");
var app = express();

app.set("views", path.resolve(__dirname, "views"));
app.set("view engine", "ejs");

mongoose.connect("mongodb://vd1:"+process.env.DB_PASSWORD+"@ds119688.mlab.com:19688/poke_swap");

setUpPassport();

/* middleware: */
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session ({
  secret : process.env.SECRET,
  resave: true,
  saveUninitialized: true
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  next();
});
app.use(function(req, res, next) {
  res.locals.incomingTrades = 0;
  res.locals.outgoingTrades = 0;
  
  if(req.isAuthenticated()) {
    Trade.find({initiator: req.user.username}, function(err, trades) {
      if(err) { return next("Database error"); }
      if(trades) {
        res.locals.outgoingTrades = trades.length;
      }
      Trade.find({recipient: req.user.username}, function(err, trades) {
        if(err) { return next("Database error"); }
        if(trades) {
          res.locals.incomingTrades = trades.length;
        }
        next();
      });
    });
  }
  else {
    next();    
  }    
});
app.use(authRouter);

app.get("/", function (req, res, next) {
  var allImages = [];
  var allOwners = [];
  Card.find({}, function(err, cards) {
    if(err) { return next("Database error"); }
    for(var ii = 0; ii < cards.length; ii++) {
      allImages.push(cards[ii].image);
      allOwners.push(cards[ii].owner);
    }
    res.locals.allImages = allImages;
    res.locals.allOwners = allOwners;
    res.render("index");
  }); 
    
});

app.get("/newTrade/:username", isAuthenticated, function(req, res, next) {
  var recipient = req.params.username;
  var initiator = res.locals.currentUser.username;
  
  if(recipient == initiator) {
    next("Can't trade with yourself");
    return;
  }
  
  var initiatorCards = [];
  var initiatorCardIds = [];
  var recipientCards = [];
  var recipientCardIds = [];
  
  Card.find({owner: initiator}, function(err, cards) {
    if(err) { return next("Database error"); }
    for(var ii = 0; ii < cards.length; ii++) {
      initiatorCards.push(cards[ii].image);
      initiatorCardIds.push(cards[ii]._id);
    }
    res.locals.initiatorCards = initiatorCards;
    
    Card.find({owner: recipient}, function(err, cards) {
      if(err) { return next("Database error"); }
      for(var ii = 0; ii < cards.length; ii++) {
        recipientCards.push(cards[ii].image);
        recipientCardIds.push(cards[ii]._id);
      }
      res.locals.recipientCards = recipientCards;
      res.locals.recipient = recipient;
      res.locals.initiator = initiator;
      res.locals.initiatorCardIds = initiatorCardIds;
      res.locals.recipientCardIds = recipientCardIds;
      res.render("request_trade");
    });
    
  });    
});

app.post("/tradeSubmit", isAuthenticated, function(req, res, next) {
  var initiator = req.body.initiator;
  var recipient = req.body.recipient;
  var iCardId = req.body.iCard;
  var rCardId = req.body.rCard;
  var iCardImg = req.body.iCardImg;
  var rCardImg = req.body.rCardImg;
  
  console.log("tradeSubmit received: "+initiator+", " + recipient + ", " + iCardImg + ", " + rCardImg);
  var newTrade = new Trade({
    initiator: initiator,
    recipient: recipient,
    iCard: iCardId,
    rCard: rCardId,
    iCardImg: iCardImg,
    rCardImg: rCardImg
  });      
  newTrade.save(function(err, _newTrade) {
    if(err) { return next("Database error: "+err); }    
    res.sendStatus(200);
  });  
});

app.get("/incomingTrades", isAuthenticated, function(req, res, next) {
  Trade.find({recipient: req.user.username}, function(err, trades) {
    if(err) { return next("Database error"); }
    res.locals.inTrades = trades;
    res.render("incoming_trades");
  });
});

app.get("/outgoingTrades", isAuthenticated, function(req, res, next) {
  Trade.find({initiator: req.user.username}, function(err, trades) {
    if(err) { return next("Database error"); }
    res.locals.outTrades = trades;
    res.render("outgoing_trades");
  });
});

app.post("/tradeAccept", isAuthenticated, function(req, res, next) {
  var tradeId = req.body.trade_id;
  console.log("tradeAccept id="+tradeId);
  var iCard;
  var rCard;
  
  Trade.findOne({_id: tradeId}, function(err, trade) {
    if(err) { return next("Database error"); }
    if(!trade) {
      console.log("Trade doesn't exist");
      Trade.find({_id: tradeId}).remove().exec();
      res.status(200).send("error3");
    }
    else {
      Card.findOne({_id: trade.iCard}, function(err, card) {
        if(err) { return next("Database error"); }
        iCard = card;
        Card.findOne({_id: trade.rCard}, function(err, card) {
          rCard = card;

          if(iCard.owner != trade.initiator) {
            console.log("Trade initiator no longer owns that card!");
            Trade.find({_id: tradeId}).remove().exec();
            res.status(200).send("error1");
          }
          else if(rCard.owner != trade.recipient) {
            console.log("Trade recipient no longer owns that card!");
            Trade.find({_id: tradeId}).remove().exec();
            res.status(200).send("error2");
          }
          else {
            iCard.owner = trade.recipient;
            iCard.save(function(err) {
              if(err) { return next("Updating iCard failed"); }  

              rCard.owner = trade.initiator;
              rCard.save(function(err) {
                if(err) { return next("Updating rCard failed"); }            
                console.log("updated both iCard and rCard");
                Trade.find({_id: tradeId}).remove().exec();
                res.status(200).send("success");
              });
            });
          }

        });    
      });
    }
  });
});

app.post("/tradeDecline", isAuthenticated, function(req, res, next) {
  var tradeId = req.body.trade_id;
  console.log("tradeDecline id="+tradeId);
  Trade.find({_id: tradeId}).remove().exec();
  res.sendStatus(200);
});


app.get("/profile/:username", function(req, res, next) {
  res.locals.username = req.params.username;
  
  User.findOne({username: res.locals.username}, function(err, user) {
    if(err) { return next("Database error"); }
    if(!user) {
      return next("Database no user found"); 
    }
    else {
      res.locals.location = user.location;
      res.locals.age = user.age;
      var cardImages = [];
      Card.find({owner: res.locals.username}, function(err, cards) {
        if(err) { return next("Database error"); }
        for(var ii = 0; ii < cards.length; ii++) {
          cardImages.push(cards[ii].image);
        }
        res.locals.cardImages = cardImages;
        res.render("profile");
      });      
      
    }
  });
});

app.post("/addCard", isAuthenticated, function(req, res, next) {
  var reqName = req.body.pokemon;
  
  Card.find({owner: req.user.username}, function(err, cards) {
    if(cards.length >= 12) {
      req.flash("error", "Limit of 12 cards reached!");
      return res.redirect("/profile/"+req.user.username);
    }
    else {
      console.log("performing fetch for name="+reqName);
  
      var fetchTerm = "https://api.pokemontcg.io/v1/cards?name=" + reqName;
      var fetchJson = fetch(fetchTerm).then(function(res) {
        console.log("got fetch result");
        return res.json();
      }).then(function(json) {
        console.log("TCG lookup returned " + json.cards.length);
        if(json.cards.length == 0) {
          req.flash("error", "Unknown Pokemon");
          res.redirect("/profile/"+req.user.username);
        }
        else {
          var randIdx = Math.floor(Math.random() * json.cards.length);
          var newImage = json.cards[randIdx].imageUrl;
          console.log("new card image="+newImage);      

          var newCard = new Card({
            owner: req.user.username,
            image: newImage
          });      
          newCard.save(function(err, _newCard) {
            res.redirect("/profile/"+req.user.username);
          });
        }
      }).catch(function () {
        console.log("Promise Rejected");
        req.flash("error", "TCG api lookup failed.");
        res.redirect("/");
      });
    }
  });
});



app.post("/setAge", isAuthenticated, function(req, res, next) {
  var newAge = req.body.newAge;
  console.log("setAge received="+newAge);
  req.user.age = newAge;
  req.user.save(function(err) {
    if(err) {
        next("Updating user age failed. err="+err);
        return;
    }
    res.sendStatus(200);
  }); 
});

app.post("/setLocation", isAuthenticated, function(req, res, next) {
  var newLocation = req.body.newLocation;
  console.log("setLocation received="+newLocation);
  req.user.location = newLocation;
  req.user.save(function(err) {
    if(err) {
        next("Updating user location failed. err="+err);
        return;
    }
    res.sendStatus(200);
  }); 
});


//app.use(function(err, req, res, next) {
//  req.flash("error", err);
//  res.redirect("/");
//});

function isAuthenticated(req,res,next) {
  if(req.isAuthenticated()){
    next();
  }
  else {
    req.flash("error", "Please log in first");
    res.redirect("/login");
  }
}

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
