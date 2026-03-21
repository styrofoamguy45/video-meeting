let localStream;
let screenStream;
let myPeer;
const videoGrid = document.getElementById('video-grid');
const connectedPeers = {};

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream = stream;
        const localVideo = document.getElementById('local-video');
        if (localVideo) {
            localVideo.srcObject = stream;
            localVideo.classList.add('active');
        }
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
            // Call the host with your camera
            const call = myPeer.call(roomToJoin, localStream);
            handleCall(call);
        }
    });

    myPeer.on('call', call => {
        // Answer incoming calls with camera
        call.answer(localStream);
        handleCall(call);
    });
}

function handleCall(call) {
    const video = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    
    // Check metadata: if it's a screen, don't mirror it
    if (call.metadata && call.metadata.type === 'screen') {
        video.classList.add('screen-share');
    }

    call.on('stream', remoteStream => {
        if (!connectedPeers[call.peer + (call.metadata?.type || 'cam')]) {
            addVideoStream(video, remoteStream);
            connectedPeers[call.peer + (call.metadata?.type || 'cam')] = call;
        }
    });

    call.on('close', () => video.remove());
}

window.shareScreen = async function() {
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenVideo = document.createElement('video');
        screenVideo.id = 'my-screen-preview';
        screenVideo.classList.add('screen-share'); // No flip for you
        
        addVideoStream(screenVideo, screenStream);

        // UI toggles
        document.getElementById('share-btn').style.display = 'none';
        document.getElementById('stop-share-btn').style.display = 'inline-block';

        // Call everyone specifically with the screen stream
        Object.keys(connectedPeers).forEach(peerId => {
            // We use the ID part of the key
            const cleanId = peerId.replace('cam', '').replace('screen', '');
            myPeer.call(cleanId, screenStream, { metadata: { type: 'screen' } });
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

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.classList.add('active');
    video.autoplay = true;
    videoGrid.append(video);
}