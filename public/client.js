$(function() {
    var FADE_IN_TIME = 150;
    var FADE_OUT_TIME = 3000;
    var TYPING_TIMER_LENGTH = 400;
    var COLORS = [
        '#e21400', '#91580f', '#f8a700', '#f78b00',
        '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
        '#3b88eb', '#3824aa', '#a700ff', '#d300e7',
        '#e21311', '#914710', '#f8b811', '#f77aff',
        '#57cbf0', '#287710', '#b8f07a', '#5ae9c4',
        '#4b99eb', '#3934ab', '#b700ff', '#d3ffc7'
    ];
  
    var $window = $(window);
    //Giris sayfasi
    var $login_page = $('.login.page');
    var $username_input = $('.username.input');
    var $image_window = $('.image.window');
    //Chat sayfasi
    var $chat_page = $('.chat.page');
    var $messages = $('.messages');
    var $message_input = $('.inputMessage');
    var $users_list = $('.users.list');
    var $users = $('.users');
    var $private_request_input =  $('.private.request.input');
    var $private_request_buttons = $('.button.group');
    var $send_button = $('.send.button');
    var $exit_button = $('.exit.button');
    var $logout_button = $('.logout.button');
    
    var username, userimage, connected = false;
    var contactName, currentRoom, privateChatFlag = false;
    var lastTypingTime, typing = false;

    var $current_input = $username_input.focus();

    var socket = io();
  
    $image_window.hide();
    
    function setUsername() {
        username = $('<div/>').text($username_input.val().trim()).html();
    
        if (username) {
            $login_page.fadeOut();
            $login_page.off('click');
            socket.emit('update users list');
            $chat_page.show();
            $current_input = $message_input.focus();
            
            user = {};
            user.username = username;
            user.userimage = socket.userimage;

            socket.emit('login user to server', user);
        }
    }

    function sendMessage() {
        var message = $message_input.val();

        message = $('<div/>').text(message).html();

        if (message && connected) {
            $message_input.val('');
            putChatMessageToPage({
                username: username,
                message: message
            });
            var messageObject = {
                username: username,
                roomId: currentRoom,
                message: message
            }
            !privateChatFlag ? 
                socket.emit('new public message', message) : socket.emit('new private message', messageObject)
        }
    }
    
    function putNotification(notification) {
        var $notification = $('<li>').addClass('log').text(notification);
        $messages.prepend($notification);
        $messages[0].scrollTop = $messages[0].scrollHeight;
    }

    function putChatMessageToPage (data, options) {
        var $typingMessages = getTypingMessages(data);
        options = options || {};

        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }
    
        var $username_to_div = $('<span class="username"/>')
            .text(data.username)
            .css('color', getUsernameColor(data.username));
        var $message_text_to_div = $('<span class="messageBody">')
            .text(data.message);
    
        var typingClass = data.typing ? 'typing' : '';
        var $message_div = $('<li class="message"/>')
            .data('username', data.username)
            .addClass(typingClass)
            .append($username_to_div, $message_text_to_div);
    
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }
        if (options.fade) {
            $message_div.hide().fadeIn(FADE_IN_TIME);
        }
        if (options.prepend) {
            $messages.prepend($message_div);
        } else {
            $messages.append($message_div);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
    }

    function removeUserTypingNotification(data) {
        getTypingMessages(data).fadeOut(function () {
            $(this).remove();
        });
    }
    
    function updateTyping() {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('user typing notification');
            }
            lastTypingTime = (new Date()).getTime();
    
            setTimeout(function () {
                var timer = (new Date()).getTime();
                if ((timer - lastTypingTime) >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('user stopped typing notification');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }
  
    function getTypingMessages(data) {
        return $('.typing.message').filter(function (i) {
            return $(this).data('username') === data.username;
        });
    }
    
    function updateUserList(users) {
        var imageAppender;
        $.each(users, function(key, data) {
            var status = data.connected ? '[Online]' : '[Offline]';
            var $username_to_div = $('<li class="users"/>')
                .text(key + ' status: ' + status)
                .css('color', getUsernameColor(data.username));
            Boolean(data.userimage) ? imageAppender = '<img src="' + data.userimage + '" height="64px" width="64px">' 
                : imageAppender = '<img src="resources/images/anon.png" height="64px" width="64px">';
            $users.append($username_to_div, imageAppender)
        });

        $users_list[0].scrollTop = $users_list[0].scrollHeight;
    }

    function getUsernameColor(username) {
        var hash = 7;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        var index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    }
    
    window.addEventListener('load', function() {
        document.querySelector('input[type="file"]').addEventListener('change', function() {
            if (this.files && this.files[0]) {
                userimage = document.querySelector('img');
                userimage.src = URL.createObjectURL(this.files[0]);
                socket.userimage = userimage.src;
            }
            $image_window.show();
        });
    });
  
    $window.keydown(function (event) {
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            $current_input.focus();
        }
        
        if (event.which === 13) {
            if (username) {
            sendMessage();
            socket.emit('user stopped typing notification');
                typing = false;
            } else {
                setUsername();
            }
        }
    });
  
    $message_input.on('input', function() {
        updateTyping();
    });
  
    $login_page.click(function () {
        $current_input.focus();
    });

    $message_input.click(function () {
        $current_input = $message_input.focus();
        $message_input.focus();
    });

    $private_request_buttons.click(function () {
        $current_input = $private_request_input.focus();
        $private_request_input.focus();
    });

    $private_request_input.click(function () {
        $current_input = $private_request_input.focus();
        $private_request_input.focus();
    });

    $send_button.click(function () {
        if (username) {
            var second_user_name = $private_request_input.val().trim();
            if (second_user_name) {
                var data = {};
                data.first_user_name = username;
                data.second_user_name = second_user_name;
                socket.emit('private chat request', data);
            } else {
                alert('Bağlanmak istediğiniz kullanıcının adını boş bırakmayın!');
            }
        } else {
            alert('Hata oluştu!');
        }
    });

    $exit_button.click(function () {
        if (privateChatFlag) {
            var data = {};
            data.first_user_name = username;
            data.second_user_name = contactName;
            data.roomId = currentRoom;
            socket.emit('private chat exit request', data);
        } else {
            alert('Özel görüşmeden çıkmak için özel görüşme içinde olmalısınız!');
        }
    });

    $logout_button.click(function () {
        socket.disconnect();
    });

    socket.on('login user to client', function (data) {
        socket.emit('update users list');
        connected = true;

        var notification = "Sohbet odasına hoşgeldiniz";
        putNotification(notification);
        data.userCount === 1 ? notification = "Su an odada sadece siz varsınız" : notification = "Odada " + data.userCount + " kişi var."; 
        putNotification(notification);
    });
    
    socket.on('user joined notification', function (data) {
        socket.emit('update users list');
        putNotification(data.username + ' odaya katıldı.');
        data.userCount === 1 ? notification = "Su an odada sadece siz varsınız." : notification = "Odada " + data.userCount + " kişi var."; 
        putNotification(notification);
    });

    socket.on('user left notification', function (data) {
        putNotification(data.username + ' left');
        data.userCount === 1 ? notification = "Su an odada sadece siz varsınız." : notification = "Odada " + data.userCount + " kişi var."; 
        putNotification(notification);
        removeUserTypingNotification(data);
        socket.emit('update users list');
    });

    socket.on('new public message', function (data) {
        putChatMessageToPage(data);
    });
    
    socket.on('new private message', function (data) {
        putChatMessageToPage(data);
    });

    socket.on('update users list', function (users) {
        $users_list.empty();
        updateUserList(users);
    });
    
    socket.on('requesting private chat', function (data) {
        if (confirm(data.first_user_name + ' özel konuşma isteğinde bulundu kabul ediyor musunuz? Kabul etmek için tamama basın.')) {
            socket.emit('accepted private chat request', data);
        } else {
            socket.emit('rejected private chat request', data);
        }
    });

    socket.on('private chat request rejected', function (data) {
        alert('Özel bağlantı isteğiniz ' + data.second_user_name + ' tarafından reddedildi.');
    });

    socket.on('inside private chat', function (data) {
        data.first_user_name === username ? contactName = data.second_user_name : contactName = data.first_user_name;
        putNotification('Su an ' + contactName + ' ile özel görüşmedesiniz.');
        privateChatFlag = true;
        currentRoom = data.roomId;
    });

    socket.on('exit private chat', function () {
        privateChatFlag = false;
        currentRoom = '';
        contactName = '';
    });

    socket.on('user typing notification', function (data) {
        data.typing = true;
        data.message = ' şuan yazıyor.';
        putChatMessageToPage(data);
    });
  
    socket.on('user stopped typing notification', function (data) {
        removeUserTypingNotification(data);
    });
    
    socket.on('facepalm user braindead', function () {
        alert('Baglanti kurmak istediğiniz kişinin adını boş bırakamazsınız ve listede olmayan bir ad veya kendi adınızı giremezsiniz.');
    });

    socket.on('check users', function () {
        var user = {};
        user.username = username;
        user.connected = connected;
        socket.emit('client connection status', user);
        socket.emit('update users list');
    });

    socket.on('disconnect', function () {
        socket.emit('update users list');
        putNotification('Bağlantiniz sonlandi.');
    });
  
    socket.on('reconnect', function () {
        socket.emit('update users list');
        putNotification('Yeniden bağlandiniz.');
        if (username) {
            socket.emit('login user to server', username);
        }
    });
  
    socket.on('reconnect_error', function () {
        putNotification('Yeniden bağlanma denemesi başarısız.');
    });
});  