let localStream;
let screenStream;
let myPeer;
let currentCall; // To keep track of the active call for screen sharing
const videoGrid = document.getElementById('video-grid');

// Get Camera/Mic on start
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
    localStream = stream;
    addVideoStream(document.getElementById('local-video'), stream);
});

// Helper: Generate a random room code (e.g., ab12-cd34)
function generateRandomId() {
    return Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6);
}

// CREATE ROOM
function createRoom() {
    const randomId = generateRandomId();
    document.getElementById('room-input').value = randomId; // Put it in the box
    document.getElementById('generated-code').innerText = randomId;
    document.getElementById('room-display').style.display = 'block';
    
    // Now initialize the peer with this ID
    startPeerSession(randomId);
}

// JOIN ROOM
function joinRoom() {
    const roomId = document.getElementById('room-input').value;
    if (!roomId) return alert("Please enter a code!");
    startPeerSession(roomId);
}

function startPeerSession(id) {
    myPeer = new Peer(id); // Using the Room Code as the Peer ID

    myPeer.on('open', peerId => {
        console.log('Room active with ID:', peerId);
        document.getElementById('setup').style.display = 'none';
    });

    // Handle being called (someone else joined the room)
    myPeer.on('call', call => {
        currentCall = call;
        call.answer(localStream);
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
        });
    });
}

// --- CONTROLS ---

async function shareScreen() {
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];

        // If we are in a call, replace the camera track with the screen track
        if (currentCall && currentCall.peerConnection) {
            const sender = currentCall.peerConnection.getSenders().find(s => s.track.kind === 'video');
            sender.replaceTrack(videoTrack);
        }

        // Handle when user clicks "Stop Sharing" in the browser UI
        videoTrack.onended = () => {
            if (currentCall && currentCall.peerConnection) {
                const sender = currentCall.peerConnection.getSenders().find(s => s.track.kind === 'video');
                sender.replaceTrack(localStream.getVideoTracks()[0]);
            }
        };
    } catch (err) {
        console.error("Error sharing screen:", err);
    }
}

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

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => video.play());
    videoGrid.append(video);
}