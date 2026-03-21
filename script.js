var localStream, screenStream, myPeer;
var videoGrid = document.getElementById('video-grid');
var connections = {};
var isSomeoneSharing = false;

const SVG_ICONS = {
    unmuted: `<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9v3a5.006 5.006 0 0 1-5 5h-4a5.006 5.006 0 0 1-5-5V9m7 9v3m-3 0h6M11 3h2a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/></svg>`,
    muted: `<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="white" d="M19.97 9.012a1 1 0 1 0-2 0h2Zm-1 2.988 1 .001V12h-1Zm-8.962 4.98-.001 1h.001v-1Zm-3.52-1.46.708-.708-.707.707ZM5.029 12h-1v.001l1-.001Zm3.984 7.963a1 1 0 1 0 0 2v-2Zm5.975 2a1 1 0 0 0 0-2v2ZM7.017 8.017a1 1 0 1 0 2 0h-2Zm6.641 4.862a1 1 0 1 0 .667 1.886l-.667-1.886Zm-7.63-2.87a1 1 0 1 0-2 0h2Zm9.953 5.435a1 1 0 1 0 1 1.731l-1-1.731ZM12 16.979h1a1 1 0 0 0-1-1v1ZM5.736 4.322a1 1 0 0 0-1.414 1.414l1.414-1.414Zm12.528 15.356a1 1 0 0 0 1.414-1.414l-1.414 1.414ZM17.97 9.012V12h2V9.012h-2Zm0 2.987a3.985 3.985 0 0 1-1.168 2.813l1.415 1.414a5.985 5.985 0 0 0 1.753-4.225l-2-.002Zm-7.962 3.98a3.985 3.985 0 0 1-2.813-1.167l-1.414 1.414a5.985 5.985 0 0 0 4.225 1.753l.002-2Zm-2.813-1.167a3.985 3.985 0 0 1-1.167-2.813l-2 .002a5.985 5.985 0 0 0 1.753 4.225l1.414-1.414Zm3.808-10.775h1.992v-2h-1.992v2Zm1.992 0c1.097 0 1.987.89 1.987 1.988h2a3.988 3.988 0 0 0-3.987-3.988v2Zm1.987 1.988v4.98h2v-4.98h-2Zm-5.967 0c0-1.098.89-1.988 1.988-1.988v-2a3.988 3.988 0 0 0-3.988 3.988h2Zm-.004 15.938H12v-2H9.012v2Zm2.988 0h2.987v-2H12v2ZM9.016 8.017V6.025h-2v1.992h2Zm5.967 2.987a1.99 1.99 0 0 1-1.325 1.875l.667 1.886a3.989 3.989 0 0 0 2.658-3.76h-2ZM6.03 12v-1.992h-2V12h2Zm10.774 2.812a3.92 3.92 0 0 1-.823.632l1.002 1.731a5.982 5.982 0 0 0 1.236-.949l-1.415-1.414ZM4.322 5.736l13.942 13.942 1.414-1.414L5.736 4.322 4.322 5.736ZM12 15.98h-1.992v2H12v-2Zm-1 1v3.984h2V16.98h-2Z"/></svg>`,
    camOn: `<svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M7.5 4.586A2 2 0 0 1 8.914 4h6.172a2 2 0 0 1 1.414.586L17.914 6H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1.086L7.5 4.586ZM10 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm2-4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" clip-rule="evenodd"/></svg>`,
    camOff: `<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="white" stroke-linejoin="round" stroke-width="2" d="M4 18V8a1 1 0 0 1 1-1h1.5l1.707-1.707A1 1 0 0 1 8.914 5h6.172a1 1 0 0 1 .707.293L17.5 7H19a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/><path stroke="white" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>`
};

async function initMedia() {
    if (localStream) return;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('local-video').srcObject = localStream;
    } catch (err) { alert("Camera permissions required."); }
}

window.createRoom = async function() {
    await initMedia();
    var id = Math.random().toString(36).substring(2, 7);
    initializePeer(id);
};

window.joinRoom = async function() {
    await initMedia();
    var roomId = document.getElementById('room-input').value;
    if (!roomId) return alert("Enter code!");
    initializePeer(null, roomId);
};

function initializePeer(id, roomToJoin) {
    myPeer = new Peer(id, { config: { 'iceServers': [{ urls: 'stun:stun.l.google.com:19302' }] } });
    myPeer.on('open', (myId) => {
        document.getElementById('setup-modal').style.display = 'none';
        document.getElementById('current-room-id').innerText = roomToJoin || myId;
        document.getElementById('room-info').style.display = 'flex';
        if (roomToJoin) {
            setupDataConnection(myPeer.connect(roomToJoin));
            setupMediaCall(myPeer.call(roomToJoin, localStream));
        }
    });
    myPeer.on('connection', setupDataConnection);
    myPeer.on('call', (call) => {
        call.answer(localStream);
        setupMediaCall(call);
    });
}

function setupDataConnection(conn) {
    connections[conn.peer] = conn;
    conn.on('data', (data) => {
        if (data.type === 'stop-screen') {
            var el = document.getElementById('cont-' + conn.peer + '-screen');
            if(el) el.remove();
            isSomeoneSharing = false;
        } else if (data.type === 'start-screen') { isSomeoneSharing = true; }
    });
}

function setupMediaCall(call) {
    var type = (call.metadata && call.metadata.type === 'screen') ? 'screen' : 'cam';
    var contId = 'cont-' + call.peer + '-' + type;
    call.on('stream', (stream) => {
        if (!document.getElementById(contId)) {
            var cont = document.createElement('div');
            cont.id = contId;
            cont.className = 'video-container' + (type === 'screen' ? ' remote-screen-share' : '');
            cont.innerHTML = `<button class="pin-btn" onclick="togglePin('${contId}')">📌</button>`;
            var v = document.createElement('video');
            v.srcObject = stream;
            v.autoplay = true;
            v.setAttribute('playsinline', 'true');
            cont.appendChild(v);
            videoGrid.appendChild(cont);
            if(type === 'screen') isSomeoneSharing = true;
        }
    });
}

window.toggleAudio = () => {
    localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
    document.getElementById('mute-icon-container').innerHTML = localStream.getAudioTracks()[0].enabled ? SVG_ICONS.unmuted : SVG_ICONS.muted;
};

window.toggleVideo = () => {
    localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled;
    document.getElementById('video-icon-container').innerHTML = localStream.getVideoTracks()[0].enabled ? SVG_ICONS.camOn : SVG_ICONS.camOff;
};

window.shareScreen = async () => {
    if (isSomeoneSharing) return alert("Someone else is already sharing!");
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        isSomeoneSharing = true;
        document.getElementById('share-btn').style.display = 'none';
        document.getElementById('stop-share-btn').style.display = 'inline-block';
        for (let p in connections) {
            connections[p].send({ type: 'start-screen' });
            myPeer.call(p, screenStream, { metadata: { type: 'screen' } });
        }
        screenStream.getVideoTracks()[0].onended = window.stopSharing;
    } catch(e) {}
};

window.stopSharing = () => {
    if(screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        isSomeoneSharing = false;
        for (let p in connections) connections[p].send({ type: 'stop-screen' });
    }
    document.getElementById('share-btn').style.display = 'inline-block';
    document.getElementById('stop-share-btn').style.display = 'none';
};

window.togglePin = (id) => {
    let el = document.getElementById(id);
    let wasPinned = el.classList.contains('pinned');
    let row = document.querySelector('.others-row');
    if(row) {
        Array.from(row.childNodes).forEach(c => videoGrid.appendChild(c));
        row.remove();
    }
    document.querySelectorAll('.video-container').forEach(c => c.classList.remove('pinned'));
    videoGrid.classList.remove('pinned-active');
    if (!wasPinned) {
        el.classList.add('pinned');
        videoGrid.classList.add('pinned-active');
        let newRow = document.createElement('div');
        newRow.className = 'others-row';
        document.querySelectorAll('.video-container').forEach(c => { if(c.id !== id) newRow.appendChild(c); });
        videoGrid.appendChild(newRow);
    }
};

window.copyRoomCode = () => {
    let code = document.getElementById('current-room-id').innerText;
    navigator.clipboard.writeText(code).then(() => {
        let toast = document.getElementById('copy-toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    });
};

window.leaveRoom = () => location.reload();
