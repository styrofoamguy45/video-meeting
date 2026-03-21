let localStream;
let screenStream;
let myPeer;
const videoGrid = document.getElementById('video-grid');
const connectedPeers = {};

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream = stream;
        document.getElementById('local-video').srcObject = stream;
    } catch (err) { console.error("Camera Error:", err); }
}
startCamera();

window.createRoom = function() {
    const randomRoomId = Math.random().toString(36).substring(2, 7);
    document.getElementById('room-input').value = randomRoomId;
    initializePeer(randomRoomId);
};

window.joinRoom = function() {
    const roomId = document.getElementById('room-input').value;
    if (!roomId) return alert("Enter code!");
    initializePeer(null, roomId);
};

window.copyRoomCode = function() {
    const code = document.getElementById('current-room-id').innerText;
    navigator.clipboard.writeText(code);
    document.getElementById('copy-btn').innerText = "Copied!";
    setTimeout(() => document.getElementById('copy-btn').innerText = "Copy Code", 2000);
};

function initializePeer(id, roomToJoin = null) {
    if (myPeer) myPeer.destroy();
    myPeer = new Peer(id, {
        config: { 'iceServers': [{ urls: 'stun:stun.l.google.com:19302' }] }
    });

    myPeer.on('open', myId => {
        document.getElementById('setup').style.display = 'none';
        const activeRoomId = roomToJoin || myId;
        document.getElementById('current-room-id').innerText = activeRoomId;
        document.getElementById('room-info').style.display = 'flex';
        if (roomToJoin) myPeer.call(roomToJoin, localStream);
    });

    myPeer.on('call', call => {
        call.answer(localStream);
        handleCall(call);
    });
}

function handleCall(call) {
    const streamType = (call.metadata && call.metadata.type === 'screen') ? 'screen' : 'cam';
    const streamId = `video-${call.peer}-${streamType}`;

    call.on('stream', remoteStream => {
        if (!document.getElementById(streamId)) {
            const video = document.createElement('video');
            video.id = streamId;
            video.srcObject = remoteStream;
            video.autoplay = true;
            video.playsInline = true;
            video.classList.add('active');
            if (streamType === 'screen') video.classList.add('remote-screen-share');
            videoGrid.appendChild(video);
            connectedPeers[streamId] = call;
        }
    });

    // Handle when someone stops sharing or leaves
    call.on('close', () => {
        document.getElementById(streamId)?.remove();
        delete connectedPeers[streamId];
    });
}

window.shareScreen = async function() {
    try {
        // Updated for mobile compatibility attempt
        const mediaDevices = navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia;
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        
        const screenVideo = document.createElement('video');
        screenVideo.id = 'my-screen-preview';
        screenVideo.srcObject = screenStream;
        screenVideo.autoplay = true;
        screenVideo.classList.add('active', 'screen-share');
        videoGrid.appendChild(screenVideo);

        document.getElementById('share-btn').style.display = 'none';
        document.getElementById('stop-share-btn').style.display = 'inline-block';

        // Notify everyone and start the screen call
        Object.keys(connectedPeers).forEach(key => {
            const peerId = connectedPeers[key].peer;
            myPeer.call(peerId, screenStream, { metadata: { type: 'screen' } });
        });

        screenStream.getVideoTracks()[0].onended = () => window.stopSharing();
    } catch (err) { alert("Screen share not supported or cancelled."); }
};

window.stopSharing = function() {
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        document.getElementById('my-screen-preview')?.remove();
        
        // This is the CRITICAL fix: Reload the peer connections to force a "close" signal
        // on the screen streams for everyone else.
        Object.keys(connectedPeers).forEach(key => {
            if (key.includes('screen')) {
                connectedPeers[key].close();
                delete connectedPeers[key];
            }
        });
    }
    document.getElementById('share-btn').style.display = 'inline-block';
    document.getElementById('stop-share-btn').style.display = 'none';
};

window.toggleAudio = function() {
    const enabled = localStream.getAudioTracks()[0].enabled;
    localStream.getAudioTracks()[0].enabled = !enabled;
    document.getElementById('mute-btn').innerText = enabled ? "Unmute" : "Mute";
};

window.toggleVideo = function() {
    const enabled = localStream.getVideoTracks()[0].enabled;
    localStream.getVideoTracks()[0].enabled = !enabled;
    document.getElementById('video-btn').innerText = enabled ? "Start Video" : "Stop Video";
};

window.leaveRoom = function() { location.reload(); };
