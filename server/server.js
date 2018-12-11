const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const auth = require('./auth');
const search = require('./search');

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(require('sanitize').middleware);

const port = process.env.PORT || 5050;

checkToken = function(req, res, cb) {
  const token = req.headerString('authorization');
  if(token) {
    auth.isLoggedIn(token, function(decodedToken) {
      if(decodedToken) {
        cb(decodedToken.id);
      } else {
        cb(null);
      }
    });
  } else {
    cb(null)
  }
}

app.get('/user', (req, res) => {
  checkToken(req, res, function(userId) {
    if(userId) {
      auth.getUser(userId, function(user) {
        res.status(200).send({data: user});
      });
    } else {
      res.status(403).send({data: null, message: "Wrong token"})
    }
  });
});

app.post('/login', (req, res) => {
  let username = req.bodyString('username');
  let pw = req.bodyString('pw');

  if(username && pw) {
    auth.login(username, pw, function(userObj) {
      if(userObj) {
        res.status(200).send({
          message: "Logged in!",
          data: userObj
        });

      } else {
        res.status(200).send({data: null, message: "Wrong username and/or password"});
      }
    });
  } else {
    res.status(200).send({data: null, message: "No username and/or password provided"});
  }
});

app.get('/wiki', (req, res) => {
  let query = req.queryString('query') || null;

  checkToken(req, res, function(userId) {
    if(userId) {
      if(query) {
        search.query(query, function(data) {
          res.status(200).send({data});
        });
      } else {
        res.status(200).send({});
      }
    } else {
      res.status(403).send({data: null, message: "Wrong token"})
    }
  });
});

search.generateIndex(function(err) {
  if(!err) {
    console.log("Indexing done");
    app.listen(port, () => console.log(`Listening on port ${port}`));
  } else {
    console.log("Indexing error", err);
  }
});
