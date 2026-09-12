const socket = io();
let currentChannelId = null;

const hashSvg = `<svg class="w-5 h-5 text-[#80848e] shrink-0" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M5.88657 21C5.57547 21 5.29901 20.7883 5.2369 20.4828L4.2369 15.4828C4.16859 15.1415 4.39708 14.813 4.7384 14.7447C5.07973 14.6764 5.40818 14.9049 5.47649 15.2462L6.34255 19.5H10.15V14.5H3.75C3.33579 14.5 3 14.1642 3 13.75C3 13.3358 3.33579 13 3.75 13H10.15V8H4.75C4.33579 8 4 7.66421 4 7.25C4 6.83579 4.33579 6.5 4.75 6.5H10.15V2.5C10.15 2.08579 10.4858 1.75 10.9 1.75C11.3142 1.75 11.65 2.08579 11.65 2.5V6.5H16.85V2.5C16.85 2.08579 17.1858 1.75 17.6 1.75C18.0142 1.75 18.35 2.08579 18.35 2.5V6.5H19.25C19.6642 6.5 20 6.83579 20 7.25C20 7.66421 19.6642 8 19.25 8H18.35V13H20.25C20.6642 13 21 13.3358 21 13.75C21 14.1642 20.6642 14.5 20.25 14.5H18.35V19.5H19.25C19.6642 19.5 20 19.8358 20 20.25C20 20.6642 19.6642 21 19.25 21H18.35L17.35 20.4828C17.0401 20.7883 16.7636 21 16.4525 21H16.85V19.5H11.65V21H12.05C12.3611 21 12.6375 20.7883 12.6996 20.4828L13.6996 15.4828C13.7679 15.1415 13.5395 14.813 13.1981 14.7447C12.8568 14.6764 12.5283 14.9049 12.46 15.2462L11.594 19.5H11.65H5.88657ZM11.65 13H16.85V8H11.65V13Z"/></svg>`;

const speakerSvg = `<svg class="w-5 h-5 text-[#80848e] shrink-0" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M11.383 3.079a1 1 0 0 1 1.317.558l4 10a1 1 0 0 1-.558 1.317l-10 4a1 1 0 0 1-1.317-.558l-4-10a1 1 0 0 1 .558-1.317l10-4ZM12 6.134 5.768 11.626l3.2 8.001 8.001-3.2-3.2-8.001L12 6.134Z"/></svg>`;

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

socket.on('login_error', (err) => { 
    document.getElementById('errorMsg').innerText = err; 
});

socket.on('guilds', (guilds) => {
    const gl = document.getElementById('guildList');
    gl.innerHTML = '';
    guilds.forEach(g => {
        const div = document.createElement('div');
        div.className = 'w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 bg-[#313338] hover:bg-[#5865F2] flex items-center justify-center cursor-pointer overflow-hidden text-white font-bold shadow-md group';
        div.title = g.name;
        div.innerHTML = g.icon ? `<img src="${g.icon}" class="w-full h-full object-cover">` : g.name.charAt(0);
        div.onclick = () => {
            socket.emit('get_guild_data', g.id);
        };
        gl.appendChild(div);
    });
});

socket.on('guild_data', (data) => {
    document.getElementById('serverName').innerText = data.guildName;
    const cl = document.getElementById('categoryList');
    cl.innerHTML = '';

    data.categories.forEach(cat => {
        const catDiv = document.createElement('div');
        catDiv.className = 'text-xs font-bold text-[#949ba4] uppercase px-2 mb-1 mt-4 tracking-wider flex items-center justify-between';
        catDiv.innerHTML = `<span>${cat.name}</span>`;
        cl.appendChild(catDiv);

        cat.channels.forEach(ch => {
            const chDiv = document.createElement('div');
            chDiv.className = `flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1] font-medium text-sm transition`;
            
            if (ch.type === 'text') {
                chDiv.innerHTML = `${hashSvg} <span class="truncate">${ch.name}</span>`;
                chDiv.onclick = () => {
                    document.querySelectorAll('#categoryList div').forEach(el => el.classList.remove('bg-[#404249]', 'text-white'));
                    chDiv.classList.add('bg-[#404249]', 'text-white');
                    currentChannelId = ch.id;
                    document.getElementById('chatHeader').innerHTML = `<span class="text-xl text-[#80848e] mr-2">#</span> ${ch.name}`;
                    socket.emit('get_messages', ch.id);
                };
            } else {
                chDiv.innerHTML = `${speakerSvg} <span class="truncate text-[#23a55a]">${ch.name}</span>`;
                chDiv.onclick = () => {
                    alert(`Voice Channel: ${ch.name}`);
                };
            }
            cl.appendChild(chDiv);
        });
    });

    const ml = document.getElementById('membersList');
    document.getElementById('memberCount').innerText = `Members — ${data.members.length}`;
    ml.innerHTML = '';
    data.members.forEach(m => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-[#35373c] cursor-pointer';
        div.innerHTML = `
            <div class="relative"><img src="${m.avatar}" class="w-8 h-8 rounded-full"></div>
            <span class="text-sm text-[#949ba4] hover:text-[#dbdee1] truncate">${m.username}</span>
        `;
        ml.appendChild(div);
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
    div.className = 'flex gap-4 items-start hover:bg-[#2e3035] -mx-4 px-4 py-1';
    div.innerHTML = `
        <img src="${m.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" class="w-10 h-10 rounded-full mt-0.5">
        <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2">
                <span class="font-medium text-white text-sm">${m.author}</span>
                <span class="text-[10px] text-[#949ba4]">${m.timestamp}</span>
            </div>
            <div class="text-[#dbdee1] text-sm break-words mt-0.5">${m.content}</div>
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
