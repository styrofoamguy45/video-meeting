let localStream;
let myPeer;
const videoGrid = document.getElementById('video-grid');
const connectedPeers = {};

// 1. Initialize Camera immediately
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream = stream;
        const localVideo = document.getElementById('local-video');
        if (localVideo) {
            localVideo.srcObject = stream;
            localVideo.classList.add('active'); // Show local video
        }
    } catch (err) {
        console.error("Camera Error:", err);
        document.getElementById('status-msg').innerText = "Please allow camera access!";
    }
}

startCamera();

// --- BUTTON FUNCTIONS ---

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
        console.log("My Peer ID:", myId);
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
    const video = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    video.id = `video-${call.peer}`;

    call.on('stream', remoteStream => {
        if (!connectedPeers[call.peer]) {
            addVideoStream(video, remoteStream);
            connectedPeers[call.peer] = call;
        }
    });

    call.on('close', () => {
        video.remove();
        delete connectedPeers[call.peer];
    });
}

// --- CONTROLS ---

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

window.shareScreen = async function() {
    if (!navigator.mediaDevices.getDisplayMedia) {
        return alert("Screen sharing is not supported on this device/browser.");
    }
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        
        Object.values(connectedPeers).forEach(call => {
            const sender = call.peerConnection.getSenders().find(s => s.track.kind === 'video');
            sender.replaceTrack(videoTrack);
        });

        videoTrack.onended = () => {
            Object.values(connectedPeers).forEach(call => {
                const sender = call.peerConnection.getSenders().find(s => s.track.kind === 'video');
                sender.replaceTrack(localStream.getVideoTracks()[0]);
            });
        };
    } catch (err) { console.error(err); }
};

window.leaveRoom = function() {
    location.reload(); 
};

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.classList.add('active');
    video.autoplay = true;
    videoGrid.append(video);
}