/**
 * Created by Hongcai Deng on 2015/12/28.
 */

'use strict';

let shortid = require('shortid');
let mailin = require('./mailin');

let onlines = new Map();

module.exports = function(io) {
  mailin.on('message', function(connection, data) {
    let to = data.headers.to.toLowerCase();
    let exp = /[\w\._\-\+]+@[\w\._\-\+]+/i;
    if(exp.test(to)) {
      let matches = to.match(exp);
      let addr = matches[0];
      if(onlines.has(addr)) {
        onlines.get(addr).emit('mail', data);
      }
    }
  });

  io.on('connection', socket => {
    socket.on('request mailaddr', function(data) {
      onlines.delete(socket.mailaddr);
      var _id = shortid.generate().toLowerCase();
      socket.mailaddr = _id + "@" + data.domain; // generate shortid for a request
      onlines.set(socket.mailaddr, socket); // add incomming connection to online table
      socket.emit('mailaddr', {id: _id, domain: data.domain});
    });

    socket.on('set mailaddr', function(data) {
      onlines.delete(socket.mailaddr);
      socket.mailaddr = data.id + "@" + data.domain;
      onlines.set(socket.mailaddr, socket);
      socket.emit('mailaddr', data);
    })
    
    socket.on('disconnect', socket => {
      onlines.delete(socket.mailaddr);
    });
  });
};
