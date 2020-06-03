/**
 * Created by Hongcai Deng on 2015/12/28.
 */

'use strict';

let path = require('path');
let mailin = require('mailin');
let config
function load_config() {
    let cpath = path.join(__dirname, '..', 'config.json')
    delete require.cache[require.resolve(cpath)];
    try {
        config = require(cpath);
    } catch(e) {
        console.log(e);
        config = require(path.join(__dirname, '..', 'config-default.json'));
    }
}

load_config();
setInterval(load_config, 3600);

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
