/**
 * Created by Hongcai Deng on 2015/12/29.
 */

$(function(){
  $('.ui.modal')
    .modal()
  ;
  $('.dropdown')
    .dropdown({
      onChange: function(value, text, $selectedItem) {
          if(value != $domain) {
              $domain && value && socket.emit('request mailaddr', {domain: value});
              $domain = value; 
          }
      }
    })
  ;

  var clipboard = new Clipboard('.copyable');

  $customShortId = $('#customShortid');
  $shortId = $('#shortid');
  $domain = null; 
  $cusstomTheme = 'check';
  $placeholder_old = '请等待分配临时邮箱';
  $placeholder_new = '请输入不带后缀邮箱账号';
  $customShortId.on('click',function() {
    var self = $(this);
    var editEnable = true;
    $shortId.prop('disabled', false);
    if(self.hasClass('edit')) {
      $shortId.prop('data-old', $shortId.val());
      $shortId.val('');
      self.removeClass('edit');
      self.toggleClass($cusstomTheme);
      $shortId.prop('placeholder', $placeholder_new);
    } else {
      $shortId.prop('disabled', true);
      self.removeClass('check');
      self.toggleClass('edit');
      $shortId.prop('placeholder',$placeholder_old);
      if($shortId.val() != "") {
          $mailUser = $shortId.val();
          setMailAddress($mailUser, $domain);
          socket.emit("set mailaddr", {id: $mailUser, domain: $domain});
      } else {
          $shortId.val($shortId.prop('data-old'));
      }
    }
  });
  
  
  $maillist = $('#maillist');

  $maillist.on('click', 'tr', function() {
    var __this = $(this);
    var mail = $(this).data('mail');
    $('#mailcard .header').text(mail.headers.subject || '无主题');
    $('#mailcard .content:last').html(mail.html);
    $('#mailcard .code').click(function() {
      $('#raw').modal('show');
    });
    $('#mailcard .trash').click(function() {
      __this.remove();
      $('#mailcard .header').text("");
      $('#mailcard .content:last').html("毛都没有( ͡° ͜ʖ ͡°)");
      db && getStore().delete(mail.messageId);
    });
    $('#raw .header').text('RAW');
    $('#raw .content').html($('<pre>').html($('<code>').addClass('language-json').html(JSON.stringify(mail, null, 2))));
    Prism.highlightAll();
  });

  var socket = io();

  var setMailAddress = function(id, domain) {
    localStorage.setItem('mailaddr', id + "@" + domain);
    $('#shortid').val(id).parent().siblings().find('.copy').attr('data-clipboard-text', id + "@" + domain);
    $("div.dropdown").dropdown("set value", domain);
    $("div.dropdown").dropdown("set text", domain);
  };

  var showMail = function(mail) {
    $tr = $('<tr>').data('mail', mail);
    $tr
      .append($('<td>').text(mail.headers.from))
      .append($('<td>').text(mail.headers.subject || '无主题'))
      .append($('<td>').text((new Date(mail.headers.date)).toLocaleTimeString()));
    $maillist.prepend($tr);
  }

  $('#refreshShortid').click(function() {
    socket.emit('request mailaddr', {domain: $domain});
  });

  $('#flushMails').click(function() {
    db && getStore().clear();
    $maillist.html("");
  });

  socket.on('connect', function() {
  });

  socket.on('domains', function(data) {
    $('.dropdown .menu').html("");
    $.each(data.domains, function(index, value){
      $div = $('<div>').addClass('item').text(value);
      $('.dropdown .menu').append($div);
    });

    if(('localStorage' in window)) {
      var mailaddress = localStorage.getItem('mailaddr');
      if(!mailaddress) {
        socket.emit('request mailaddr', {domain: $domain || data.domains[0]});
      }
      else {
        var _ = mailaddress.split("@");
        socket.emit('set mailaddr', {id: _[0], domain: _[1]});
      }
    }
  });

  socket.on('mailaddr', function(data) {
    setMailAddress(data.id, data.domain);
  });

  socket.on('mail', function(mail) {
    if(('Notification' in window)) {
      if(Notification.permission === 'granted') {
        new Notification('New mail from ' + mail.headers.from);
      }
      else if(Notification.permission !== 'denied') {
        Notification.requestPermission(function(permission) {
          if(permission === 'granted') {
            new Notification('New mail from ' + mail.headers.from);
          }
        })
      }
    }

    showMail(mail);

    db && getStore().put(mail);
  });

  socket.on('stat', function(stat) {
      $('.mailcount').html(stat.mail);
      $('.boxcount').html(stat.box);
      $('.onlinecount').html(stat.online);
      $('.usercount').html(stat.user);
  });

  var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
  var open = indexedDB.open("forsaken-mail", 1);
  var db;

  open.onupgradeneeded = function() {
      open.result.createObjectStore("MailStore", {keyPath: "messageId"});
      //var index = store.createIndex("NameIndex", ["name.last", "name.first"]);
  };

  open.onsuccess = function() {
      db = open.result;
      getStore().getAll().onsuccess = function(e) {
          $.each(e.target.result, function(index, value){
            showMail(value);
          })
      };
  }

  var getStore = function () {
    if(!db) return;
    var tx = db.transaction("MailStore", "readwrite");
    var store = tx.objectStore("MailStore");
    tx.oncomplete = function() {
      //db.close();
    };
    return store;
  }

});
