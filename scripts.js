// YouTube IFrame Player APIを埋め込む
let ytPlayer;
let currentSongInterval;
let videos = [];

// APIの準備ができたときにプレイヤーを生成
function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('sample', {
        height: '500',
        width: '900',
        videoId: 'T7CYthEK67Y',
        playerVars: { controls: 1, autoplay: 0 },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': updateCurrentSongOnSeek,
            'onError': onPlayerError,
        },
    });
}

// JSONデータを読み込む
const loadVideos = async () => {
    try {
        const response = await fetch('./videos.json');
        if (!response.ok) throw new Error(`HTTP Error! status: ${response.status}`);
        videos = await response.json();
    } catch (error) {
        console.error('Failed to load JSON:', error);
        videos = [];
    }
};

// 動画選択用ドロップダウンを初期化
async function initializeVideoSelection() {
    await loadVideos();
    const videoSelect = document.getElementById('video-select');
    const timestampSelect = document.getElementById('timestamp-select');
    const currentSongContainer = document.getElementById('current-song');

    videoSelect.style.width = "350px";
    timestampSelect.style.width = "350px";

    videos.forEach((video, index) => {
        videoSelect.add(new Option(video.videoName, index));
    });

    videoSelect.addEventListener('change', ({ target: { value: idx } }) => {
        const video = videos[idx];
        if (!video) {
            resetTimestampDropdown(timestampSelect, currentSongContainer);
            return;
        }

        populateTimestampDropdown(video, timestampSelect); // **曲名ドロップダウンが正しく生成されるよう修正**
        resetCurrentSong(currentSongContainer);
    });

    timestampSelect.addEventListener('change', ({ target: { value: startSeconds } }) => {
        if (!isNaN(startSeconds)) {
            const videoIdx = videoSelect.value;
            const video = videos[videoIdx];
            const selectedTimestamp = video.timestamps.find(ts => ts.start === startSeconds);

            if (selectedTimestamp) {
                ytPlayer.loadVideoById({
                    videoId: video.videoId,
                    startSeconds: parseFloat(selectedTimestamp.start),
                });

                updateCurrentSong(selectedTimestamp);
            }
        }
    });
}

// タイムスタンプをドロップダウンに追加
function populateTimestampDropdown(video, dropdown) {
    dropdown.innerHTML = ''; // **ドロップダウン初期化を適切に処理**

    video.timestamps.forEach(({ start, title, artist }) => {
        const optionText = `${title}${artist ? ` (${artist})` : ''}`;
        const option = new Option(optionText, start);
        dropdown.add(option);
    });
}

// タイムスタンプドロップダウンをリセット
function resetTimestampDropdown(dropdown, songContainer) {
    dropdown.innerHTML = '<option value="">歌枠を選んだら曲も選んでくれよな！</option>'; // **リセット処理の確認**
    resetCurrentSong(songContainer);
}

// 楽曲情報を更新
function updateCurrentSong(selectedTimestamp) {
    const currentSongContainer = document.getElementById('current-song');
    currentSongContainer.textContent = `現在の楽曲：${selectedTimestamp.title} ${selectedTimestamp.artist ? `(${selectedTimestamp.artist})` : ""}`;
}

// 楽曲情報のリセット
function resetCurrentSong(songContainer) {
    songContainer.textContent = "現在の楽曲：";
}

// **シークバー変更やボタン操作に対応**
function updateCurrentSongOnSeek() {
    setInterval(() => {
        const currentTime = ytPlayer.getCurrentTime();
        const currentVideoId = ytPlayer.getVideoData().video_id;
        const currentSongContainer = document.getElementById('current-song');

        const currentVideo = videos.find(video => video.videoId === currentVideoId);
        if (!currentVideo) return;

        const timestamps = currentVideo.timestamps;
        const currentTimestamp = timestamps.find((ts, idx) =>
            currentTime >= parseFloat(ts.start) &&
            (idx === timestamps.length - 1 || currentTime < parseFloat(timestamps[idx + 1].start))
        );

        if (currentTimestamp) {
            updateCurrentSong(currentTimestamp);
        }
    }, 1000);
}

// **ボタン操作の処理**
function initializeButtonControls() {
    const controls = {
        play: () => {
            ytPlayer.playVideo();
            updateCurrentSongOnSeek();
        },
        pause: () => ytPlayer.pauseVideo(),
        stop: () => {
            ytPlayer.pauseVideo();
            ytPlayer.seekTo(0);
            resetCurrentSong(document.getElementById('current-song'));
        },
        prev: () => ytPlayer.seekTo(Math.max(ytPlayer.getCurrentTime() - 10, 0)),
        next: () => ytPlayer.seekTo(ytPlayer.getCurrentTime() + 10),
        volup: () => ytPlayer.setVolume(Math.min(ytPlayer.getVolume() + 10, 100)),
        voldown: () => ytPlayer.setVolume(Math.max(ytPlayer.getVolume() - 10, 0)),
        mute: () => ytPlayer.isMuted() ? ytPlayer.unMute() : ytPlayer.mute(),
    };

    Object.entries(controls).forEach(([id, fn]) =>
        document.getElementById(id).addEventListener('click', fn)
    );
}

// **ランダム再生ボタン修正**
document.getElementById('random').addEventListener('click', () => {
    const randomVideoIndex = Math.floor(Math.random() * videos.length);
    const randomVideo = videos[randomVideoIndex];
    const randomTimestampIndex = Math.floor(Math.random() * randomVideo.timestamps.length);
    const randomTimestamp = randomVideo.timestamps[randomTimestampIndex];

    if (!randomVideo.videoId || !randomTimestamp.start) {
        return alert('無効な動画またはタイムスタンプです。');
    }

    ytPlayer.stopVideo(); // **停止ボタンを押した後でも動作するよう修正**
    ytPlayer.loadVideoById({
        videoId: randomVideo.videoId,
        startSeconds: parseInt(randomTimestamp.start, 10),
    });

    updateCurrentSong(randomTimestamp);
});

// **プレイヤー準備完了時の処理**
const onPlayerReady = () => {
    initializeButtonControls();
    updateCurrentSongOnSeek();
};

// **エラー処理**
const onPlayerError = ({ data }) => console.error('エラーが発生しました:', data);

// **DOMがロードされたら初期化**
document.addEventListener('DOMContentLoaded', initializeVideoSelection);
