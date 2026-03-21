let localStream;
let screenStream;
let myPeer;
const videoGrid = document.getElementById('video-grid');
const connections = {}; // Stores DataConnections
const calls = {}; // Stores MediaCalls

// For Android: Start camera ONLY after a button click to satisfy security
async function initMedia() {
    if (localStream) return;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('local-video').srcObject = localStream;
    } catch (err) {
        alert("Camera access denied. Please use HTTPS and allow permissions.");
    }
}

window.createRoom = async function() {
    await initMedia();
    const id = Math.random().toString(36).substring(2, 7);
    document.getElementById('room-input').value = id;
    initializePeer(id);
};

window.joinRoom = async function() {
    await initMedia();
    const roomId = document.getElementById('room-input').value;
    if (!roomId) return alert("Enter code!");
    initializePeer(null, roomId);
};

function initializePeer(id, roomToJoin = null) {
    myPeer = new Peer(id, {
        config: { 'iceServers': [{ urls: 'stun:stun.l.google.com:19302' }] },
        debug: 1
    });

    myPeer.on('open', myId => {
        document.getElementById('setup').style.display = 'none';
        const activeId = roomToJoin || myId;
        document.getElementById('current-room-id').innerText = activeId;
        document.getElementById('room-info').style.display = 'flex';

        if (roomToJoin) {
            // 1. Connect for Data (to send "stop screen" signals)
            const conn = myPeer.connect(roomToJoin);
            setupDataConnection(conn);
            // 2. Call for Video
            const call = myPeer.call(roomToJoin, localStream);
            setupMediaCall(call);
        }
    });

    // Listen for incoming Data
    myPeer.on('connection', conn => setupDataConnection(conn));

    // Listen for incoming Calls
    myPeer.on('call', call => {
        call.answer(localStream);
        setupMediaCall(call);
    });
}

function setupDataConnection(conn) {
    connections[conn.peer] = conn;
    conn.on('data', data => {
        if (data.type === 'stop-screen') {
            document.getElementById(`video-${conn.peer}-screen`)?.remove();
        }
    });
}

function setupMediaCall(call) {
    const type = (call.metadata && call.metadata.type === 'screen') ? 'screen' : 'cam';
    const streamId = `video-${call.peer}-${type}`;

    call.on('stream', stream => {
        if (!document.getElementById(streamId)) {
            const video = document.createElement('video');
            video.id = streamId;
            video.srcObject = stream;
            video.autoplay = true;
            video.playsInline = true; // Crucial for Android/iOS
            video.classList.add('active');
            if (type === 'screen') video.classList.add('remote-screen-share');
            videoGrid.appendChild(video);
            calls[streamId] = call;
        }
    });

    call.on('close', () => document.getElementById(streamId)?.remove());
}

window.shareScreen = async function() {
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const preview = document.createElement('video');
        preview.id = 'my-screen-preview';
        preview.srcObject = screenStream;
        preview.autoplay = true;
        preview.classList.add('active');
        videoGrid.appendChild(preview);

        document.getElementById('share-btn').style.display = 'none';
        document.getElementById('stop-share-btn').style.display = 'inline-block';

        // Call everyone with the screen
        Object.values(connections).forEach(conn => {
            myPeer.call(conn.peer, screenStream, { metadata: { type: 'screen' } });
        });

        screenStream.getVideoTracks()[0].onended = () => window.stopSharing();
    } catch (err) { console.error("Screen share failed", err); }
};

window.stopSharing = function() {
    if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        document.getElementById('my-screen-preview')?.remove();

        // SIGNAL others to remove the box
        Object.values(connections).forEach(conn => {
            conn.send({ type: 'stop-screen' });
        });
    }
    document.getElementById('share-btn').style.display = 'inline-block';
    document.getElementById('stop-share-btn').style.display = 'none';
};

window.copyRoomCode = function() {
    const code = document.getElementById('current-room-id').innerText;
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
