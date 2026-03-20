console.log("LOG: Script started loading...");

// --- GLOBAL VARIABLES ---
let localStream;
let myPeer;
const videoGrid = document.getElementById('video-grid');
const connectedPeers = {}; 

// --- INITIALIZE CAMERA ---
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        console.log("LOG: Camera access granted.");
        localStream = stream;
        const localVideo = document.getElementById('local-video');
        if (localVideo) localVideo.srcObject = stream;
    })
    .catch(err => console.error("Media error:", err));

// --- ROOM FUNCTIONS ---
window.createRoom = function() {
    const randomRoomId = Math.random().toString(36).substring(2, 7);
    document.getElementById('room-input').value = randomRoomId;
    initializePeer(randomRoomId);
};

window.joinRoom = function() {
    const roomId = document.getElementById('room-input').value;
    if (!roomId) return alert("Enter a code!");
    initializePeer(null, roomId);
};

function initializePeer(id, roomToJoin = null) {
    if (myPeer) myPeer.destroy();
    myPeer = new Peer(id);

    myPeer.on('open', myId => {
        console.log("LOG: Peer opened with ID:", myId);
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
    const video = document.createElement('video');
    video.id = `video-${call.peer}`; 

    call.on('stream', remoteStream => {
        if (!connectedPeers[call.peer]) {
            addVideoStream(video, remoteStream);
            connectedPeers[call.peer] = call;
        }
    });

    call.on('close', () => {
        const remoteVideo = document.getElementById(`video-${call.peer}`);
        if (remoteVideo) remoteVideo.remove();
        delete connectedPeers[call.peer];
    });
}

// --- CONTROL FUNCTIONS ---
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
    if (myPeer) myPeer.destroy();
    location.reload();
};

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    videoGrid.append(video);
}

console.log("LOG: Script fully loaded and functions are mapped to window.");