import axios from 'axios';

const baseUrl = "http://localhost:5050/";

const getHeaders = function(token) {
  return {headers: {'Authorization': token}};
}

const get = function(route, token, cb) {
  axios.get(baseUrl + route, getHeaders(token)).then((res) => {
    if(res.status === 200 && res.data.data) {
      cb(res.data.data, null);
    } else {
      cb(null, res.data.message);
    }
  }).catch((err) => {
    cb(null, "");
  });
}

const post = function(route, params, cb) {
  axios.post(baseUrl + route, params).then((res) => {
    if(res.status === 200 && res.data.data) {
      cb(res.data.data, null);
    } else {
      cb(null, res.data.message);
    }
  }).catch((err) => {
    cb(null, "Something went wrong!");
  });
}

export {get, post};
