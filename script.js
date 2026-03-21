var localStream, screenStream, myPeer;
var videoGrid = document.getElementById('video-grid');
var connections = {};
var isSomeoneSharing = false;

// Initialize Camera
async function initMedia() {
    if (localStream) return;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('local-video').srcObject = localStream;
    } catch (err) { alert("Enable HTTPS/Camera."); }
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
        document.getElementById('setup-modal').style.display = 'none';
        document.getElementById('current-room-id').innerText = roomToJoin || myId;
        document.getElementById('room-info').style.display = 'flex';
        if (roomToJoin) {
            setupDataConnection(myPeer.connect(roomToJoin));
            setupMediaCall(myPeer.call(roomToJoin, localStream));
        }
    });

    myPeer.on('connection', setupDataConnection);
    myPeer.on('call', function(call) {
        call.answer(localStream);
        setupMediaCall(call);
    });
}

function setupDataConnection(conn) {
    connections[conn.peer] = conn;
    conn.on('data', function(data) {
        if (data.type === 'stop-screen') {
            removeElement('cont-' + conn.peer + '-screen');
            isSomeoneSharing = false;
        } else if (data.type === 'start-screen') { isSomeoneSharing = true; }
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

window.togglePin = function(containerId) {
    var el = document.getElementById(containerId);
    var wasPinned = el.classList.contains('pinned');

    // Reset everything
    var all = document.querySelectorAll('.video-container');
    all.forEach(c => c.classList.remove('pinned'));
    videoGrid.classList.remove('pinned-active');

    if (!wasPinned) {
        el.classList.add('pinned');
        videoGrid.classList.add('pinned-active');
        
        // Move all non-pinned into a sub-container row
        var row = document.createElement('div');
        row.className = 'others-row';
        all.forEach(c => { if(c.id !== containerId) row.appendChild(c); });
        videoGrid.appendChild(row);
    } else {
        // Return all from row to grid
        var row = document.querySelector('.others-row');
        if(row) {
            all.forEach(c => videoGrid.appendChild(c));
            row.remove();
        }
    }
};

window.shareScreen = async function() {
    if (isSomeoneSharing) return alert("Locked: Someone else is sharing.");
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        isSomeoneSharing = true;
        // (Similar setup logic as before, call peers with metadata)
    } catch (e) {}
};

function removeElement(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
}

window.copyRoomCode = function() {
    var code = document.getElementById('current-room-id').innerText;
    navigator.clipboard.writeText(code).then(() => { alert("Copied!"); });
};

window.leaveRoom = () => location.reload();
