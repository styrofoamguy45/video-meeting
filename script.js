let localStream;
let screenStream;
let myPeer;
const videoGrid = document.getElementById('video-grid');
const connectedPeers = {};

// Initialize Camera
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream = stream;
        const localVideo = document.getElementById('local-video');
        if (localVideo) localVideo.srcObject = stream;
    } catch (err) {
        console.error("Camera Error:", err);
    }
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

function initializePeer(id, roomToJoin = null) {
    if (myPeer) myPeer.destroy();
    myPeer = new Peer(id);

    myPeer.on('open', myId => {
        document.getElementById('setup').style.display = 'none';
        if (roomToJoin) {
            const call = myPeer.call(roomToJoin, localStream);
            handleCall(call);
        }
    });

    myPeer.on('call', call => {
        call.answer(localStream);
        handleCall(call);
    });
}

function handleCall(call) {
    call.on('stream', remoteStream => {
        const streamType = (call.metadata && call.metadata.type === 'screen') ? 'screen' : 'cam';
        const streamId = `video-${call.peer}-${streamType}`;

        if (!document.getElementById(streamId)) {
            const video = document.createElement('video');
            video.id = streamId;
            video.srcObject = remoteStream;
            video.autoplay = true;
            video.playsInline = true;
            video.classList.add('active');

            if (streamType === 'screen') {
                video.classList.add('remote-screen-share');
            }

            videoGrid.appendChild(video);
            connectedPeers[call.peer + streamType] = call;
        }
    });

    call.on('close', () => {
        document.getElementById(`video-${call.peer}-cam`)?.remove();
        document.getElementById(`video-${call.peer}-screen`)?.remove();
    });
}

window.shareScreen = async function() {
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        
        // Create YOUR preview
        const screenVideo = document.createElement('video');
        screenVideo.id = 'my-screen-preview';
        screenVideo.srcObject = screenStream;
        screenVideo.autoplay = true;
        screenVideo.classList.add('active');
        videoGrid.appendChild(screenVideo);

        // UI toggles
        document.getElementById('share-btn').style.display = 'none';
        document.getElementById('stop-share-btn').style.display = 'inline-block';

        // Call everyone with the screen
        Object.keys(connectedPeers).forEach(peerId => {
            const targetId = peerId.replace('cam', '').replace('screen', '');
            myPeer.call(targetId, screenStream, { metadata: { type: 'screen' } });
        });

        screenStream.getVideoTracks()[0].onended = () => window.stopSharing();
    } catch (err) { console.error(err); }
};

window.stopSharing = function() {
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        document.getElementById('my-screen-preview')?.remove();
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