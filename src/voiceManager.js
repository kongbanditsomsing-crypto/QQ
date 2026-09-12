const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');

let voiceConnection = null;
const audioPlayer = createAudioPlayer();

const SOUNDBOARD_LIST = [
    { id: 'bruh', name: '🔊 Bruh', url: 'https://www.myinstants.com/media/sounds/movie_1.mp3' },
    { id: 'airhorn', name: '📯 Airhorn', url: 'https://www.myinstants.com/media/sounds/mlg-air-horn.mp3' },
    { id: 'laugh', name: '😂 Meme Laugh', url: 'https://www.myinstants.com/media/sounds/cuek.mp3' },
    { id: 'quack', name: '🦆 Quack', url: 'https://www.myinstants.com/media/sounds/quack.mp3' }
];

function connectToVoice(channel, adapterCreator) {
    if (voiceConnection) {
        voiceConnection.destroy();
    }

    voiceConnection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: adapterCreator,
        selfMute: false,
        selfDeaf: false
    });

    voiceConnection.subscribe(audioPlayer);
    return true;
}

function leaveVoice() {
    if (voiceConnection) {
        voiceConnection.destroy();
        voiceConnection = null;
        return true;
    }
    return false;
}

function playSound(soundId) {
    if (!voiceConnection) return { success: false, msg: "บอทไม่ได้อยู่ในห้อง VC!" };

    const sound = SOUNDBOARD_LIST.find(s => s.id === soundId);
    if (!sound) return { success: false, msg: "ไม่พบเสียง" };

    try {
        const resource = createAudioResource(sound.url);
        audioPlayer.play(resource);
        return { success: true, soundName: sound.name };
    } catch (e) {
        return { success: false, msg: "เล่นเสียงไม่สำเร็จ" };
    }
}

module.exports = {
    connectToVoice,
    leaveVoice,
    playSound,
    SOUNDBOARD_LIST
};
