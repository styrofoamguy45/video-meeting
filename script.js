let localStream;
let myPeer;
const videoGrid = document.getElementById('video-grid');
const connectedPeers = {}; // Keep track of who we are already talking to

// 1. Setup Camera
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
    localStream = stream;
    addVideoStream(document.getElementById('local-video'), stream);
});

// 2. Create Room (You become the 'Host' - your ID is the Room Code)
function createRoom() {
    const randomRoomId = Math.random().toString(36).substring(2, 7);
    document.getElementById('room-input').value = randomRoomId;
    
    // Initialize Peer with the Room Code as YOUR ID
    initializePeer(randomRoomId);
}

// 3. Join Room (You get a random ID, then call the Room Code)
function joinRoom() {
    const roomId = document.getElementById('room-input').value;
    if (!roomId) return alert("Enter a room code!");

    // Initialize Peer with a RANDOM ID for yourself
    initializePeer(null, roomId);
}

function initializePeer(id, roomToJoin = null) {
    // If id is null, PeerJS picks a random one for you
    myPeer = new Peer(id);

    myPeer.on('open', myId => {
        console.log("Connected to server. My ID is: " + myId);
        document.getElementById('setup').style.display = 'none';

        // If we are joining someone else, call them!
        if (roomToJoin) {
            console.log("Calling room host: " + roomToJoin);
            const call = myPeer.call(roomToJoin, localStream);
            handleCall(call);
        }
    });

    // Handle incoming calls (When people join YOU)
    myPeer.on('call', call => {
        console.log("Receiving call from: " + call.peer);
        call.answer(localStream);
        handleCall(call);
    });

    myPeer.on('error', err => {
        console.error("PeerJS Error:", err.type);
        if (err.type === 'unavailable-id') alert("Room code taken! Use 'Join' or a different code.");
    });
}

function handleCall(call) {
    const video = document.createElement('video');
    call.on('stream', remoteStream => {
        // Prevent adding the same person twice
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

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => video.play());
    videoGrid.append(video);
}