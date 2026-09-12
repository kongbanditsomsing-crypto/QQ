const socket = io();
let currentChannelId = null;

function login() {
    const token = document.getElementById('tokenInput').value;
    if (!token) return;
    document.getElementById('errorMsg').innerText = "Connecting...";
    socket.emit('login', token);
}

socket.on('login_success', (user) => {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('userName').innerText = user.username;
    document.getElementById('userTag').innerText = "#" + user.tag;
    document.getElementById('userAvatar').src = user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
});

socket.on('login_error', (err) => { document.getElementById('errorMsg').innerText = err; });

socket.on('guilds', (guilds) => {
    const gl = document.getElementById('guildList');
    gl.innerHTML = '';
    guilds.forEach(g => {
        const div = document.createElement('div');
        div.className = 'guild-icon';
        div.title = g.name;
        div.innerHTML = g.icon ? `<img src="${g.icon}">` : g.name.charAt(0);
        div.onclick = () => {
            document.querySelectorAll('.guild-icon').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            socket.emit('get_guild_data', g.id);
        };
        gl.appendChild(div);
    });
});

// Render Categories และ Voice Channels
socket.on('guild_data', (data) => {
    document.getElementById('serverName').innerText = data.guildName;
    const cl = document.getElementById('categoryList');
    cl.innerHTML = '';

    data.categories.forEach(cat => {
        const catDiv = document.createElement('div');
        catDiv.className = 'category-title';
        catDiv.innerHTML = `<span>▼</span> ${cat.name}`;
        cl.appendChild(catDiv);

        cat.channels.forEach(ch => {
            const chDiv = document.createElement('div');
            chDiv.className = `channel-item ${ch.type === 'voice' ? 'voice' : ''}`;
            
            if (ch.type === 'text') {
                chDiv.innerHTML = `<span>#</span> ${ch.name}`;
                chDiv.onclick = () => {
                    document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
                    chDiv.classList.add('active');
                    currentChannelId = ch.id;
                    document.getElementById('chatHeader').innerText = `# ${ch.name}`;
                    socket.emit('get_messages', ch.id);
                };
            } else {
                chDiv.innerHTML = `<span>🔊</span> ${ch.name}`;
                chDiv.onclick = () => {
                    socket.emit('join_vc', ch.id);
                };
            }
            cl.appendChild(chDiv);

            // รายชื่อคนสิงใน VC
            if (ch.type === 'voice' && ch.members.length > 0) {
                ch.members.forEach(m => {
                    const mDiv = document.createElement('div');
                    mDiv.className = 'vc-member';
                    mDiv.innerHTML = `<img src="${m.avatar}"> <span>${m.username}</span>`;
                    cl.appendChild(mDiv);
                });
            }
        });
    });

    // แสดงสมาชิกขวามือ
    const ml = document.getElementById('membersList');
    document.getElementById('memberCount').innerText = `MEMBERS — ${data.members.length}`;
    ml.innerHTML = '';
    data.members.forEach(m => {
        const div = document.createElement('div');
        div.className = 'member-item';
        div.innerHTML = `<img src="${m.avatar}"> <span style="font-size:14px; color:#949ba4;">${m.username}</span>`;
        ml.appendChild(div);
    });
});

// สถานะการเข้า Voice Channel
socket.on('vc_status', (data) => {
    const vp = document.getElementById('voicePanel');
    if (data.connected) {
        vp.classList.remove('hidden');
        document.getElementById('vcChannelName').innerText = data.channelName;
    } else {
        vp.classList.add('hidden');
    }
});

function leaveVC() {
    socket.emit('leave_vc');
}

// Soundboard Render
socket.on('soundboard_list', (sounds) => {
    const grid = document.getElementById('soundboardGrid');
    grid.innerHTML = '';
    sounds.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'sound-btn';
        btn.innerText = s.name;
        btn.onclick = () => socket.emit('play_soundboard', s.id);
        grid.appendChild(btn);
    });
});

socket.on('messages', (msgs) => {
    const ml = document.getElementById('messagesList');
    ml.innerHTML = '';
    msgs.forEach(m => addMessage(m));
    ml.scrollTop = ml.scrollHeight;
});

socket.on('new_message', (m) => {
    if (m.channelId === currentChannelId) {
        addMessage(m);
        const ml = document.getElementById('messagesList');
        ml.scrollTop = ml.scrollHeight;
    }
});

function addMessage(m) {
    const ml = document.getElementById('messagesList');
    const div = document.createElement('div');
    div.className = 'message';
    div.innerHTML = `
        <img src="${m.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}">
        <div>
            <div class="message-header">
                <span class="author">${m.author}</span>
                <span class="time">${m.timestamp}</span>
            </div>
            <div style="color:#dbdee1; font-size:15px; margin-top:4px;">${m.content}</div>
        </div>
    `;
    ml.appendChild(div);
}

function handleEnter(e) {
    if (e.key === 'Enter') {
        const val = document.getElementById('msgInput').value;
        if (val.trim() !== '' && currentChannelId) {
            socket.emit('send_message', { channelId: currentChannelId, content: val });
            document.getElementById('msgInput').value = '';
        }
    }
}
