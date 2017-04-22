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
      console.log($shortId.prop('data-old'));
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
    var mail = $(this).data('mail');
    $('#mailcard .header').text(mail.headers.subject || '无主题');
    $('#mailcard .content:last').html(mail.html);
    $('#mailcard i').click(function() {
      $('#raw').modal('show');
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

  $('#refreshShortid').click(function() {
    socket.emit('request mailaddr', {domain: $domain});
  });

  socket.on('connect', function() {
    if(('localStorage' in window)) {
      var mailaddress = localStorage.getItem('mailaddr');
      if(!mailaddress) {
        socket.emit('request mailaddr', {domain: $domain || "fuckdog.tk"});
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
    $tr = $('<tr>').data('mail', mail);
    $tr
      .append($('<td>').text(mail.headers.from))
      .append($('<td>').text(mail.headers.subject || '无主题'))
      .append($('<td>').text((new Date(mail.headers.date)).toLocaleTimeString()));
    $maillist.prepend($tr);
  });
});
