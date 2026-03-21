var localStream;
var screenStream;
var myPeer;
var videoGrid = document.getElementById('video-grid');
var connections = {}; 
var calls = {}; 

async function initMedia() {
    if (localStream) return;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('local-video').srcObject = localStream;
    } catch (err) {
        alert("Camera error. Use HTTPS and allow permissions.");
    }
}

window.createRoom = async function() {
    await initMedia();
    var id = Math.random().toString(36).substring(2, 7);
    document.getElementById('room-input').value = id;
    initializePeer(id);
};

window.joinRoom = async function() {
    await initMedia();
    var roomId = document.getElementById('room-input').value;
    if (!roomId) return alert("Enter code!");
    initializePeer(null, roomId);
};

function initializePeer(id, roomToJoin) {
    myPeer = new Peer(id, {
        config: { 'iceServers': [{ urls: 'stun:stun.l.google.com:19302' }] }
    });

    myPeer.on('open', function(myId) {
        document.getElementById('setup').style.display = 'none';
        var activeId = roomToJoin || myId;
        document.getElementById('current-room-id').innerText = activeId;
        document.getElementById('room-info').style.display = 'flex';

        if (roomToJoin) {
            var conn = myPeer.connect(roomToJoin);
            setupDataConnection(conn);
            var call = myPeer.call(roomToJoin, localStream);
            setupMediaCall(call);
        }
    });

    myPeer.on('connection', function(conn) { setupDataConnection(conn); });
    myPeer.on('call', function(call) {
        call.answer(localStream);
        setupMediaCall(call);
    });
}

function setupDataConnection(conn) {
    connections[conn.peer] = conn;
    conn.on('data', function(data) {
        if (data.type === 'stop-screen') {
            // AGGRESSIVE REMOVAL
            var el = document.getElementById('video-' + conn.peer + '-screen');
            if (el) el.parentNode.removeChild(el);
        }
    });
}

function setupMediaCall(call) {
    var type = (call.metadata && call.metadata.type === 'screen') ? 'screen' : 'cam';
    var streamId = 'video-' + call.peer + '-' + type;

    call.on('stream', function(stream) {
        if (!document.getElementById(streamId)) {
            var video = document.createElement('video');
            video.id = streamId;
            video.srcObject = stream;
            video.autoplay = true;
            video.setAttribute('playsinline', 'true');
            video.classList.add('active');
            if (type === 'screen') video.classList.add('remote-screen-share');
            videoGrid.appendChild(video);
            calls[streamId] = call;
        }
    });

    call.on('close', function() {
        var el = document.getElementById(streamId);
        if (el) el.parentNode.removeChild(el);
    });
}

window.shareScreen = async function() {
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        var preview = document.createElement('video');
        preview.id = 'my-screen-preview';
        preview.srcObject = screenStream;
        preview.autoplay = true;
        preview.classList.add('active');
        videoGrid.appendChild(preview);

        document.getElementById('share-btn').style.display = 'none';
        document.getElementById('stop-share-btn').style.display = 'inline-block';

        for (var peerId in connections) {
            myPeer.call(peerId, screenStream, { metadata: { type: 'screen' } });
        }

        screenStream.getVideoTracks()[0].onended = function() { window.stopSharing(); };
    } catch (err) { console.error(err); }
};

window.stopSharing = function() {
    if (screenStream) {
        screenStream.getTracks().forEach(function(t) { t.stop(); });
        var el = document.getElementById('my-screen-preview');
        if (el) el.parentNode.removeChild(el);

        for (var peerId in connections) {
            connections[peerId].send({ type: 'stop-screen' });
        }
    }
    document.getElementById('share-btn').style.display = 'inline-block';
    document.getElementById('stop-share-btn').style.display = 'none';
};

window.copyRoomCode = function() {
    var code = document.getElementById('current-room-id').innerText;
    navigator.clipboard.writeText(code);
    document.getElementById('copy-btn').innerText = "Copied!";
    setTimeout(function() { document.getElementById('copy-btn').innerText = "Copy Code"; }, 2000);
};

window.toggleAudio = function() {
    localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
    document.getElementById('mute-btn').innerText = localStream.getAudioTracks()[0].enabled ? "Mute" : "Unmute";
};

window.toggleVideo = function() {
    localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled;
    document.getElementById('video-btn').innerText = localStream.getVideoTracks()[0].enabled ? "Stop Video" : "Start Video";
};

window.leaveRoom = function() { location.reload(); };
