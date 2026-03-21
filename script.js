var localStream, screenStream, myPeer;
var videoGrid = document.getElementById('video-grid');
var connections = {};
var isSomeoneSharing = false; // The Lock

async function initMedia() {
    if (localStream) return;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('local-video').srcObject = localStream;
    } catch (err) { alert("Camera error. Ensure HTTPS."); }
}

window.createRoom = async function() {
    await initMedia();
    var id = Math.random().toString(36).substring(2, 7);
    initializePeer(id);
};

window.joinRoom = async function() {
    await initMedia();
    var roomId = document.getElementById('room-input').value;
    if (!roomId) return alert("Enter code!");
    initializePeer(null, roomId);
};

function initializePeer(id, roomToJoin) {
    myPeer = new Peer(id, { config: { 'iceServers': [{ urls: 'stun:stun.l.google.com:19302' }] } });
    myPeer.on('open', function(myId) {
        document.getElementById('setup').style.display = 'none';
        var activeId = roomToJoin || myId;
        document.getElementById('current-room-id').innerText = activeId;
        document.getElementById('room-info').style.display = 'flex';
        if (roomToJoin) {
            setupDataConnection(myPeer.connect(roomToJoin));
            setupMediaCall(myPeer.call(roomToJoin, localStream));
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
            var el = document.getElementById('cont-' + conn.peer + '-screen');
            if (el) el.parentNode.removeChild(el);
            isSomeoneSharing = false;
        } else if (data.type === 'start-screen') {
            isSomeoneSharing = true;
        }
    });
}

function setupMediaCall(call) {
    var type = (call.metadata && call.metadata.type === 'screen') ? 'screen' : 'cam';
    var contId = 'cont-' + call.peer + '-' + type;

    call.on('stream', function(stream) {
        if (!document.getElementById(contId)) {
            var cont = document.createElement('div');
            cont.id = contId;
            cont.className = 'video-container' + (type === 'screen' ? ' remote-screen-share' : '');
            
            cont.innerHTML = '<button class="pin-btn" onclick="togglePin(\''+contId+'\')">📌</button>';
            var video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.setAttribute('playsinline', 'true');
            cont.appendChild(video);
            videoGrid.appendChild(cont);
            if(type === 'screen') isSomeoneSharing = true;
        }
    });
}

window.shareScreen = async function() {
    if (isSomeoneSharing) return alert("Someone is already sharing their screen!");
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        isSomeoneSharing = true;
        
        var cont = document.createElement('div');
        cont.id = 'my-screen-cont';
        cont.className = 'video-container';
        cont.innerHTML = '<button class="pin-btn" onclick="togglePin(\'my-screen-cont\')">📌</button>';
        var preview = document.createElement('video');
        preview.id = 'my-screen-preview';
        preview.srcObject = screenStream;
        preview.autoplay = true;
        cont.appendChild(preview);
        videoGrid.appendChild(cont);

        document.getElementById('share-btn').style.display = 'none';
        document.getElementById('stop-share-btn').style.display = 'inline-block';

        for (var peerId in connections) {
            connections[peerId].send({ type: 'start-screen' });
            myPeer.call(peerId, screenStream, { metadata: { type: 'screen' } });
        }
        screenStream.getVideoTracks()[0].onended = window.stopSharing;
    } catch (err) { console.error(err); }
};

window.stopSharing = function() {
    if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        var el = document.getElementById('my-screen-cont');
        if (el) el.parentNode.removeChild(el);
        isSomeoneSharing = false;
        for (var peerId in connections) {
            connections[peerId].send({ type: 'stop-screen' });
        }
    }
    document.getElementById('share-btn').style.display = 'inline-block';
    document.getElementById('stop-share-btn').style.display = 'none';
};

window.togglePin = function(containerId) {
    var el = document.getElementById(containerId);
    var isPinned = el.classList.contains('pinned');
    
    // Unpin everything first
    var all = document.querySelectorAll('.video-container');
    for (var i = 0; i < all.length; i++) { all[i].classList.remove('pinned'); }
    videoGrid.classList.remove('pinned-active');

    if (!isPinned) {
        el.classList.add('pinned');
        videoGrid.classList.add('pinned-active');
    }
};

window.copyRoomCode = function() {
    var code = document.getElementById('current-room-id').innerText;
    navigator.clipboard.writeText(code);
    document.getElementById('copy-btn').innerText = "Copied!";
    setTimeout(() => document.getElementById('copy-btn').innerText = "Copy Code", 2000);
};

window.toggleAudio = () => {
    localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
    document.getElementById('mute-btn').innerText = localStream.getAudioTracks()[0].enabled ? "Mute" : "Unmute";
};

window.toggleVideo = () => {
    localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled;
    document.getElementById('video-btn').innerText = localStream.getVideoTracks()[0].enabled ? "Stop Video" : "Start Video";
};

window.leaveRoom = () => location.reload();
