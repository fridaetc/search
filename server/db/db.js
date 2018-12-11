const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('./db/db_users.json');
const db = low(adapter);

exports.getUser = function(username) {
  return db.get('users').find({username}).value();
}

exports.getUserById = function(id) {
  return db.get('users').find({id}).value();
}
