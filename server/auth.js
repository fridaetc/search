const bcrypt = require('bcrypt');
const db = require('./db/db');
const jwt = require('jsonwebtoken');

const saltRounds = 10;
const verySecretSecret = "12345";

exports.login = function(username, pw, cb) {
  username = username.toLowerCase();
  let user = db.getUser(username);
  if(user) {
    bcrypt.compare(pw, user.pw, function(err, res) {
      if(res == false) {
        //wrong login
        cb(null);
      } else {
        //correct login = create token
        jwt.sign({username: user.username, id: user.id}, verySecretSecret, {expiresIn: 86400}, function(err, token) {
          if(token) {
            cb({userName: user.name, token});
          } else {
            cb(null);
          }
        }); //24 hours
      }
    });
  } else {
    cb(null);
  }
}

exports.isLoggedIn = function(token, cb) {
  jwt.verify(token, verySecretSecret, function(err, decoded) {
   if(err) {
     cb(false);
   }
   cb(decoded);
 });
}

exports.getUser = function(userId, cb) {
  let user = db.getUserById(userId);
  if(user) {
    cb({userName: user.name});
  } else {
    cb(null);
  }
}
