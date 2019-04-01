//Degiskenlerin nasil tanimlanacagina socket.io sitesinden bakilmistir.
var express = require('express'),
    app = express(),
    path = require('path'),
    server = require('http').createServer(app),
    io = require('socket.io')(server),
    port = process.env.PORT || 3000;

server.listen(port, function () {
    console.log('Server ' + port + ' numaralı portta başlatıldı.');
});

app.use(express.static(path.join(__dirname, 'public')));

var userCount = 0;
var users = {}, clients = {};

io.on('connection', function (socket) {
    var addedUser = false;

    socket.on('login user to server', function (user) {
        if (addedUser) return;

        if (Boolean(socket.userip)) return;
      
        socket.username = user.username;
        socket.userimage = user.userimage;
        socket.userip = socket.handshake.address;
        socket.connected = true;
        users[socket.username] = {
            username: socket.username,
            userimage: socket.userimage || null,
            connected: true
        };
        clients[socket.username] = socket;
        ++userCount;
        addedUser = true;
        socket.emit('login user to client', {
            userCount: userCount
        });
        
        socket.broadcast.emit('user joined notification', {
            username: socket.username,
            userCount: userCount
        });
        
        socket.broadcast.emit('update users list', users);
    });

    socket.on('new public message', function (data) {
        socket.broadcast.emit('new public message', {
            username: socket.username,
            message: data
        });
    });

    socket.on('new private message', function (data) {
        var roomId = data.roomId;
        socket.to('room:' + roomId).emit('new public message', {
            username: socket.username,
            message: data.message
        });
    });

    socket.on('user typing notification', function () {
        socket.broadcast.emit('user typing notification', {
            username: socket.username
        });
    });

    socket.on('update users list', function () {
        socket.broadcast.emit('update users list', users);
    });
    
    socket.on('user stopped typing notification', function () {
        socket.broadcast.emit('user stopped typing notification', {
            username: socket.username
        });
    });

    socket.on('private chat request', function (data) {
        var second_user = data.second_user_name;
        if (second_user in clients) {
            var second_user_id = clients[second_user].id;
            socket.to(second_user_id).emit('requesting private chat', data);
        } else if (second_user === socket.username) {
            socket.emit('facepalm user braindead');
        } else {
            socket.emit('facepalm user braindead');
        }
    }); 

    setInterval(function () {
        socket.broadcast.emit('check users'); 
    }, 15000);

    socket.on('client connection status', function (user) {
        if (addedUser) {
            var username = user.username;
            user.connected ? users[username].connected = true : users[username].connected = false;
            socket.broadcast.emit('update users list', users);   
        }
    });

    socket.on('private chat exit request', function (data) {
        var roomId = data.roomId;
        io.of('/').in('room:' + roomId).clients((error, socketIds) => {
            if (error) throw error;
            
            socketIds.forEach(socketId => {
                io.sockets.sockets[socketId].emit('exit private chat');
                io.sockets.sockets[socketId].leave('room:' + roomId)
            });
        });
    }); 

    socket.on('accepted private chat request', function (data) {
        var first_user = data.first_user_name;
        var second_user = data.second_user_name;
        var first_user_id = clients[first_user].id;
        var second_user_id = clients[second_user].id;
        var first_user_socket = clients[first_user];
        var second_user_socket = clients[second_user];
        var roomId = first_user_id + second_user_id;
        first_user_socket.join('room:' + roomId);
        second_user_socket.join('room:' + roomId);
        data.roomId = roomId;
        io.to('room:' + roomId).emit('inside private chat', data);
    });

    socket.on('rejected private chat request', function (data) {
        var first_user_id = clients[data.first_user_name].id;
        socket.to(first_user_id).emit('private chat request rejected', data);
    });

    socket.on('disconnect', function () {
        if (addedUser) {
            --userCount;

            users[socket.username] = {
                username: socket.username,
                userimage: socket.userimage || null,
                connected: false
            };
            
            socket.broadcast.emit('user left notification', {
                username: socket.username,
                userCount: userCount
            });
            socket.broadcast.emit('update users list', users);
        }
    });
});