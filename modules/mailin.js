/**
 * Created by Hongcai Deng on 2015/12/28.
 */

'use strict';

let path = require('path');
let mailin = require('mailin');
let config
try {
    config = require(path.join(__dirname, '..', 'config.json'));
} catch(e) {
    console.log(e);
    config = require(path.join(__dirname, '..', 'config-default.json'));
}

mailin.start(config.mailin);

mailin.on('error', function(err) {
//  console.error(err.stack);
});

mailin.on('authorizeUser', function(connection, username, password, done) {
  console.log("* AUTH", username, password);
  done(null, {user: username});
  return true;
});

module.exports = mailin;
