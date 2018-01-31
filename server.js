var express = require('express');
var path = require("path");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var passport = require("passport");
var flash = require("connect-flash");
var setUpPassport = require("./setuppassport");
var User = require("./models/user");
var Card = require("./models/card");
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

app.get("/", function (req, res) {
  res.render("index");
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
      res.render("profile");  
    }
  });
});

app.post("/addCard"), isAuthenticated, function(req, res, next) {
  var reqName = req.params.pokemon;
  
  var fetchTerm = "https://api.pokemontcg.io/v1/cards?name=" + reqName;
  var fetchJson = fetch(fetchTerm).then(function(res) {
    console.log("got fetch result");
    return res.json();
  }).then(function(json) {
    if(json.length == 0) {
      req.flash("error", "Unknown Pokemon");
      res.redirect("/profile/"+req.user.username);
    }
    else {
      var randIdx = Math.floor(Math.random() * 20);
    }
    
    var datePriceArr = [];
    var chartData = [];
    for(var ii = json.dataset.data.length-1; ii >= 0; ii--) {
      var date = Date.parse(json.dataset.data[ii][0]);  // natural to unix timestamp
      datePriceArr = [date, json.dataset.data[ii][4]];
      chartData.push(datePriceArr);
      datePriceArr = [];
    }
    
    symbolList.push(json.dataset.dataset_code);
    var newSeries = {name: json.dataset.dataset_code, data: chartData};
    globalSeriesArr.push(newSeries);
    globalSeriesArrString = JSON.stringify(globalSeriesArr);
    
    //res.locals.seriesArr = globalSeriesArrString;
    for(var key in wsConnections) {
      wsConnections[key].sendUTF(JSON.stringify({ cmd:'reload'}) );
    }
  }).catch(function () {
    console.log("Promise Rejected");
    req.flash("error", "TCG api lookup failed.");
    res.redirect("/");
  });
});




app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", passport.authenticate("login", {
  successRedirect: "/",
  failureRedirect: "/login",
  failureFlash: true
}));

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/signup", function (req, res) {
  res.render("signup");
});

app.post("/signup", function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  
  User.findOne({username: username}, function(err, user) {
    if(err) { return next(err); }
    if(user) {
      req.flash("error", "Username taken");
      return res.redirect("/signup");
    }
    var newUser = new User({
      username: username,
      password: password
    });
    newUser.save(next);
  });
}, passport.authenticate("login", {
  successRedirect: "/",
  failureRedirect: "/signup",
  failureFlash: true
}));


app.use(function(err, req, res, next) {
  req.flash("error", err);
  return res.redirect("/");
});

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
