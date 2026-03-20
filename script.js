let localStream;
let myPeer;
const videoGrid = document.getElementById('video-grid');
const connectedPeers = {}; 

// Initialize Camera
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
    localStream = stream;
    const localVideo = document.getElementById('local-video');
    if (localVideo) localVideo.srcObject = stream;
}).catch(err => console.error("Media error:", err));

// --- ROOM LOGIC ---

function createRoom() {
    const randomRoomId = Math.random().toString(36).substring(2, 7);
    document.getElementById('room-input').value = randomRoomId;
    initializePeer(randomRoomId);
}

function joinRoom() {
    const roomId = document.getElementById('room-input').value;
    if (!roomId) return alert("Enter a code!");
    initializePeer(null, roomId);
}

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
    const video = document.createElement('video');
    // Assign an ID so we can remove it specifically later
    video.id = `video-${call.peer}`; 

    call.on('stream', remoteStream => {
        if (!connectedPeers[call.peer]) {
            addVideoStream(video, remoteStream);
            connectedPeers[call.peer] = call;
        }
    });

    // Cleanup when the other person leaves
    call.on('close', () => {
        const remoteVideo = document.getElementById(`video-${call.peer}`);
        if (remoteVideo) remoteVideo.remove();
        delete connectedPeers[call.peer];
    });
}

// --- CONTROLS ---

function toggleAudio() {
    const enabled = localStream.getAudioTracks()[0].enabled;
    localStream.getAudioTracks()[0].enabled = !enabled;
    document.getElementById('mute-btn').innerText = enabled ? "Unmute" : "Mute";
}

function toggleVideo() {
    const enabled = localStream.getVideoTracks()[0].enabled;
    localStream.getVideoTracks()[0].enabled = !enabled;
    document.getElementById('video-btn').innerText = enabled ? "Start Video" : "Stop Video";
}

async function shareScreen() {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];

        // Replace track for everyone you are connected to
        Object.values(connectedPeers).forEach(call => {
            const sender = call.peerConnection.getSenders().find(s => s.track.kind === 'video');
            sender.replaceTrack(videoTrack);
        });

        // Switch back to camera when screen sharing stops
        videoTrack.onended = () => {
            Object.values(connectedPeers).forEach(call => {
                const sender = call.peerConnection.getSenders().find(s => s.track.kind === 'video');
                sender.replaceTrack(localStream.getVideoTracks()[0]);
            });
        };
    } catch (err) {
        console.error("Screen share error:", err);
    }
}

function leaveRoom() {
    if (myPeer) myPeer.destroy(); // Disconnect from server
    location.reload(); // Refresh the page to reset everything
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    videoGrid.append(video);
}