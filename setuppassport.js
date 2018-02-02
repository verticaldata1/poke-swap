var passport = require("passport");
var User = require("./models/user");
var localStrategy = require("passport-local").Strategy;

passport.use("login", new localStrategy(function(username, password, done/*(err,user,msg)*/) {
  User.findOne({username: username}, function(err, user) {
    if(err) { return done(err); }
    if(!user) {
      return done(null, false, {message: "No user with that username"}); 
    }
    user.checkPassword(password, function(err, isMatch) {
      if(err) { return done(err); }
      if(isMatch) {
        return done(null, user);
      }
      else {
        return done(null, false, {message: "Invalid password"}); 
      }
    });
  });
}));

module.exports = function() {
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
};