var localStream, screenStream, myPeer, myNick;
var videoGrid = document.getElementById('video-grid');
var connections = {};
var remoteNicks = {};

const SVG_ICONS = {
    unmuted: `<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9v3a5.006 5.006 0 0 1-5 5h-4a5.006 5.006 0 0 1-5-5V9m7 9v3m-3 0h6M11 3h2a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/></svg>`,
    muted: `<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="white" d="M19.97 9.012a1 1 0 1 0-2 0h2Zm-1 2.988 1 .001V12h-1Zm-8.962 4.98-.001 1h.001v-1Zm-3.52-1.46.708-.708-.707.707ZM5.029 12h-1v.001l1-.001Zm3.984 7.963a1 1 0 1 0 0 2v-2Zm5.975 2a1 1 0 0 0 0-2v2ZM7.017 8.017a1 1 0 1 0 2 0h-2Zm6.641 4.862a1 1 0 1 0 .667 1.886l-.667-1.886Zm-7.63-2.87a1 1 0 1 0-2 0h2Zm9.953 5.435a1 1 0 1 0 1 1.731l-1-1.731ZM12 16.979h1a1 1 0 0 0-1-1v1ZM5.736 4.322a1 1 0 0 0-1.414 1.414l1.414-1.414Zm12.528 15.356a1 1 0 0 0 1.414-1.414l-1.414 1.414ZM17.97 9.012V12h2V9.012h-2Zm0 2.987a3.985 3.985 0 0 1-1.168 2.813l1.415 1.414a5.985 5.985 0 0 0 1.753-4.225l-2-.002Zm-7.962 3.98a3.985 3.985 0 0 1-2.813-1.167l-1.414 1.414a5.985 5.985 0 0 0 4.225 1.753l.002-2Zm-2.813-1.167a3.985 3.985 0 0 1-1.167-2.813l-2 .002a5.985 5.985 0 0 0 1.753 4.225l1.414-1.414Zm3.808-10.775h1.992v-2h-1.992v2Zm1.992 0c1.097 0 1.987.89 1.987 1.988h2a3.988 3.988 0 0 0-3.987-3.988v2Zm1.987 1.988v4.98h2v-4.98h-2Zm-5.967 0c0-1.098.89-1.988 1.988-1.988v-2a3.988 3.988 0 0 0-3.988 3.988h2Zm-.004 15.938H12v-2H9.012v2Zm2.988 0h2.987v-2H12v2ZM9.016 8.017V6.025h-2v1.992h2Zm5.967 2.987a1.99 1.99 0 0 1-1.325 1.875l.667 1.886a3.989 3.989 0 0 0 2.658-3.76h-2ZM6.03 12v-1.992h-2V12h2Zm10.774 2.812a3.92 3.92 0 0 1-.823.632l1.002 1.731a5.982 5.982 0 0 0 1.236-.949l-1.415-1.414ZM4.322 5.736l13.942 13.942 1.414-1.414L5.736 4.322 4.322 5.736ZM12 15.98h-1.992v2H12v-2Zm-1 1v3.984h2V16.98h-2Z"/></svg>`,
    camOn: `<svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M7.5 4.586A2 2 0 0 1 8.914 4h6.172a2 2 0 0 1 1.414.586L17.914 6H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1.086L7.5 4.586ZM10 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm2-4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" clip-rule="evenodd"/></svg>`,
    camOff: `<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="white" stroke-linejoin="round" stroke-width="2" d="M4 18V8a1 1 0 0 1 1-1h1.5l1.707-1.707A1 1 0 0 1 8.914 5h6.172a1 1 0 0 1 .707.293L17.5 7H19a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/><path stroke="white" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>`,
    copyIdle: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3m0 3h6m-6 5h6m-6 4h6M10 3v4h4V3h-4Z"/></svg>`,
    copyDone: `<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3m0 3h6m-6 7 2 2 4-4m-5-9v4h4V3h-4Z"/></svg>`,
    pinned: `<svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M5 9a7 7 0 1 1 8 6.93V21a1 1 0 1 1-2 0v-5.07A7.001 7.001 0 0 1 5 9Zm5.94-1.06A1.5 1.5 0 0 1 12 7.5a1 1 0 1 0 0-2A3.5 3.5 0 0 0 8.5 9a1 1 0 0 0 2 0c0-.398.158-.78.44-1.06Z" clip-rule="evenodd"/></svg>`,
    unpinned: `<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0 0v6M9.5 9A2.5 2.5 0 0 1 12 6.5"/></svg>`
};

async function initMedia() {
    if (localStream) return;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('local-video').srcObject = localStream;
    } catch (err) { alert("Access denied."); }
}

window.createRoom = async () => {
    myNick = document.getElementById('nick-input').value || "Guest";
    await initMedia();
    initializePeer(Math.random().toString(36).substring(2, 7));
};

window.joinRoom = async () => {
    myNick = document.getElementById('nick-input').value || "Guest";
    let r = document.getElementById('room-input').value;
    if (!r) return alert("Room?");
    await initMedia();
    initializePeer(null, r);
};

function initializePeer(id, r) {
    myPeer = new Peer(id);
    myPeer.on('open', (myId) => {
        document.getElementById('setup-modal').style.display = 'none';
        document.getElementById('room-info').style.display = 'flex';
        document.getElementById('current-room-id').innerText = r || myId;
        if (r) {
            let conn = myPeer.connect(r);
            setupData(conn);
            setupCall(myPeer.call(r, localStream));
        }
    });
    myPeer.on('connection', setupData);
    myPeer.on('call', (call) => { call.answer(localStream); setupCall(call); });
}

function setupData(conn) {
    connections[conn.peer] = conn;
    conn.on('open', () => {
        conn.send({ type: 'nick', nick: myNick });
    });
    conn.on('data', (d) => {
        if(d.type === 'leave') cleanup(conn.peer);
        if(d.type === 'nick') {
            remoteNicks[conn.peer] = d.nick;
            let tag = document.getElementById('nick-' + conn.peer);
            if(tag) tag.innerText = d.nick;
        }
    });
    conn.on('close', () => cleanup(conn.peer));
}

function setupCall(call) {
    let type = (call.metadata && call.metadata.type === 'screen') ? 'screen' : 'cam';
    let cid = 'cont-' + call.peer + '-' + type;

    call.on('stream', (s) => {
        if (!document.getElementById(cid)) {
            let div = document.createElement('div');
            div.id = cid; 
            div.className = 'video-container' + (type==='screen'?' remote-screen-share':'');
            
            let displayNick = remoteNicks[call.peer] || 'Connecting...';
            
            div.innerHTML = `
                <div class="name-tag" id="nick-${call.peer}">${displayNick}${type==='screen'?' (Screen)':''}</div>
                <button class="pin-btn" onclick="togglePin('${cid}')" id="pin-${cid}">${SVG_ICONS.unpinned}</button>
                <video autoplay playsinline></video>
            `;
            div.querySelector('video').srcObject = s;
            videoGrid.appendChild(div);
        }
    });
    call.on('close', () => cleanup(call.peer));
}

function cleanup(peerId) {
    let c1 = document.getElementById('cont-' + peerId + '-cam');
    let c2 = document.getElementById('cont-' + peerId + '-screen');
    if(c1) c1.remove();
    if(c2) c2.remove();
    
    if(videoGrid.querySelectorAll('.video-container').length <= 1) {
        videoGrid.classList.remove('pinned-active');
    }
}

// Ensures we tell others to delete our box if we close the browser tab completely
window.addEventListener('beforeunload', () => {
    for(let p in connections) connections[p].send({type: 'leave'});
});

window.togglePin = (id) => {
    let el = document.getElementById(id);
    let btn = document.getElementById('pin-' + id);
    let wasPinned = el.classList.contains('pinned');
    
    // Reset all pins visually and structurally
    let row = document.querySelector('.others-row');
    if(row) { Array.from(row.childNodes).forEach(c => videoGrid.appendChild(c)); row.remove(); }
    
    document.querySelectorAll('.video-container').forEach(c => c.classList.remove('pinned'));
    document.querySelectorAll('.pin-btn').forEach(b => b.innerHTML = SVG_ICONS.unpinned);
    videoGrid.classList.remove('pinned-active');
    
    // Apply pin if it wasn't already pinned
    if(!wasPinned) {
        el.classList.add('pinned'); 
        btn.innerHTML = SVG_ICONS.pinned;
        videoGrid.classList.add('pinned-active');
        
        let nr = document.createElement('div'); 
        nr.className = 'others-row';
        document.querySelectorAll('.video-container').forEach(c => { if(c.id !== id) nr.appendChild(c); });
        videoGrid.appendChild(nr);
    }
};

window.copyRoomCode = () => {
    navigator.clipboard.writeText(document.getElementById('current-room-id').innerText).then(() => {
        let btn = document.getElementById('copy-icon-container');
        btn.innerHTML = SVG_ICONS.copyDone;
        setTimeout(() => btn.innerHTML = SVG_ICONS.copyIdle, 2000);
    });
};

window.leaveRoom = () => {
    for(let p in connections) connections[p].send({type: 'leave'});
    location.reload();
};

window.toggleAudio = () => {
    localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
    document.getElementById('mute-icon-container').innerHTML = localStream.getAudioTracks()[0].enabled ? SVG_ICONS.unmuted : SVG_ICONS.muted;
};

window.toggleVideo = () => {
    localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled;
    document.getElementById('video-icon-container').innerHTML = localStream.getVideoTracks()[0].enabled ? SVG_ICONS.camOn : SVG_ICONS.camOff;
};
