/**
 * Created by Hongcai Deng on 2015/12/28.
 */

'use strict';

let shortid = require('shortid');
let mailin = require('./mailin');
let path = require('path');
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

try {
    config = require(path.join(__dirname, '..', 'config.json'));
} catch(e) {
    console.log(e);
    config = require(path.join(__dirname, '..', 'config-default.json'));
}

let onlines = new Map();
let stat = {mail:0, box:0, online:0, user:0};

module.exports = function(io) {
  mailin.on('message', function(connection, data) {
    console.log("*****************************")
    console.log("标题：" + data.subject)
    console.log("HTML：" + data.textAsHtml)
    console.log("文本：" + data.text)
    console.log("时间：" + data.date)
    console.log("发件：" + data.from.text)
    console.log("*****************************")

    let to = data.envelopeTo[0].address.toLowerCase();
    let exp = /[\w\._\-\+]+@[\w\._\-\+]+/i;
    if(exp.test(to)) {
      stat.mail += 1;
      let matches = to.match(exp);
      let addr = matches[0];
      if(onlines.has(addr)) {
        let _data = {
            "subject": data.subject,
            "text" : data.text,
            "date" : data.date,
            "from" : data.from.text,
            "texthtml" : data.textAsHtml,
            "html" : data.html
        }
        onlines.get(addr)
            .emit('mail', data)
            .emit('stat', stat);
      }
    }
  });

    
  mailin.on('validateSender', function(session, address, callback) {
    if (/sharepointonline.com/ig.test(address)) { 
        let _err = new Error('You are blocked(TM你已经被我ban了)'); 
        _err.responseCode = 530; 
        callback(_err);
    } else {
        callback()
    }   
  })
    
  io.on('connection', socket => {
    stat.user += 1;
    /*onlines.forEach(function(v, k, m){
      v.emit('stat', stat);
    });*/
    socket.emit('domains', {"domains": config.domains});
    var _intv = setInterval(function(){socket.emit('stat', stat)}, 10000);

    socket.on('request mailaddr', function(data) {
      onlines.delete(socket.mailaddr);
      var _id = shortid.generate().toLowerCase();
      socket.mailaddr = _id + "@" + data.domain; // generate shortid for a request
      onlines.set(socket.mailaddr, socket); // add incomming connection to online table
      socket.emit('mailaddr', {id: _id, domain: data.domain});
      stat.box += 1;
      stat.online = onlines.size;
      socket.emit('stat', stat);
    });

    socket.on('set mailaddr', function(data) {
      if(config.domains.indexOf(data.domain) == -1) {
        socket.emit('mailaddr', socket.mailaddr);
        return;
      } 
      onlines.delete(socket.mailaddr);
      socket.mailaddr = data.id + "@" + data.domain;
      onlines.set(socket.mailaddr, socket);
      stat.online = onlines.size;
      socket.emit('mailaddr', data);
      socket.emit('stat', stat);
    })
    
    socket.on('disconnect', reason => {
      onlines.delete(socket.mailaddr);
      stat.online = onlines.size;
      /*onlines.forEach(function(v, k, m){
        v.emit('stat', stat);
      });*/
      clearInterval(_intv);
    });

  });
};
