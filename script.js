let localStream;
let myPeer;
const peers = {}; // Keep track of all connected people
const videoGrid = document.getElementById('video-grid');
let roomTimer;

// Start camera immediately
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
    localStream = stream;
    addVideoStream(document.getElementById('local-video'), stream);
});

function createRoom() {
    const randomId = Math.random().toString(36).substring(2, 7);
    document.getElementById('room-input').value = randomId;
    startPeerSession(randomId);
    startRoomTimeout(); // Start the 10-minute "Empty Room" check
}

function joinRoom() {
    const roomId = document.getElementById('room-input').value;
    if (!roomId) return alert("Enter code!");
    startPeerSession(roomId);
}

function startPeerSession(id) {
    myPeer = new Peer(); // Let PeerJS give us a random unique user ID

    myPeer.on('open', userId => {
        console.log("My ID:", userId);
        document.getElementById('setup').style.display = 'none';
        
        // Use a "Data Connection" to the Room ID to tell others we are here
        // Note: In a simple GitHub app, the Room ID is actually the first person's ID.
        const conn = myPeer.connect(id);
        conn.on('open', () => {
            conn.send({ type: 'new-user', userId: userId });
        });
    });

    // Handle being called (Video/Audio)
    myPeer.on('call', call => {
        call.answer(localStream);
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
            clearTimeout(roomTimer); // Someone joined! Stop the countdown.
        });
    });

    // Handle someone sending us their ID so we can call them
    myPeer.on('connection', conn => {
        conn.on('data', data => {
            if (data.type === 'new-user') {
                const call = myPeer.call(data.userId, localStream);
                const video = document.createElement('video');
                call.on('stream', userVideoStream => {
                    addVideoStream(video, userVideoStream);
                });
            }
        });
    });
}

// --- ROOM TIMEOUT (10 Minutes) ---
function startRoomTimeout() {
    console.log("Room timeout started. 10 minutes until self-destruct.");
    roomTimer = setTimeout(() => {
        alert("Room expired: No one joined within 10 minutes.");
        location.reload(); // Refresh the page to "close" the room
    }, 600000); // 600,000ms = 10 mins
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => video.play());
    videoGrid.append(video);
}