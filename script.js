// script.js

// 遊戲狀態
const gameState = {
    photos: {
        1: { name: "墾丁恆春", url: "photo_kenting.jpg", collected: false },
        2: { name: "澎湖船上", url: "photo_penghu.jpg", collected: false },
        3: { name: "八三夭演唱會", url: "photo_concert.jpg", collected: false },
        4: { name: "大阪京都", url: "photo_kyoto.jpg", collected: false }
    },
    collectedCount: 0,
    levelNames: {
        1: "恆春海底撈回憶",
        2: "乘風破浪的澎湖",
        3: "八三夭的熱血現場",
        4: "大阪京都漫步"
    }
};

const modalOverlay = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');
const progressText = document.getElementById('progress-text');

// 基礎功能
function openLevel(num) {
    if (gameState.photos[num].collected) { showPhotoPreview(num); return; }
    if (num === 1) renderLevel1();
    else if (num === 2) renderLevel2();
    else if (num === 3) renderLevel3();
    else if (num === 4) renderLevel4();
    else {
        const title = gameState.levelNames[num];
        modalBody.innerHTML = `<div style="text-align: center;"><div style="font-size: 60px; margin-bottom: 20px;">🧩</div><h2 style="margin-bottom: 15px; color: #4a403a;">${title}</h2><p style="color: #888; line-height: 1.6; margin-bottom: 30px;">完成關卡挑戰，就能找回照片。</p><button class="action-btn" onclick="completeLevel(${num})">開始挑戰</button></div>`;
    }
    modalOverlay.style.display = 'flex';
}

function showPhotoPreview(num) {
    const photo = gameState.photos[num];
    modalBody.innerHTML = `<div style="text-align: center;"><div style="margin-bottom: 15px;"><img src="${photo.url}" style="width: 100%; max-height: 400px; object-fit: contain; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border: 8px solid white;"></div><h2 style="color: #4a403a; margin-bottom: 5px;">${photo.name}</h2><p style="color: #888; font-size: 14px; margin-bottom: 20px;">這是一段珍貴的回憶 ✨</p><button class="action-btn" onclick="closeModal()">收起照片</button></div>`;
    modalOverlay.style.display = 'flex';
}

// ==========================================
// 【第三關：八三夭節奏遊戲 - 專業時間軸引擎】
// ==========================================
let rhythmAudio = null;
let activeNotes = [];
let noteChart = [];
let rhythmGameLoop = null;
let rhythmStats = { perfect: 0, good: 0, miss: 0, total: 0, maxPossibleScore: 0 };
const TRAVEL_TIME = 1800; // 音符下落總時長 (ms) - 再放慢一點更舒服
const JUDGE_LINE_Y = 340; // 判定線 Y 軸位置 (px)

function renderLevel3() {
    rhythmStats = { perfect: 0, good: 0, miss: 0, total: 0, maxPossibleScore: 0 };
    activeNotes = [];

    modalBody.innerHTML = `
        <div style="text-align:center; padding-bottom:10px;">
            <h2 style="color:#d63384; text-wrap: balance;">🎸 八三夭：愛了愛了</h2>
        </div>
        <div class="rhythm-game-full" id="rhythm-container">
            <div class="stage-bg"><div class="spotlight"></div></div>
            <div class="rhythm-stats">
                <div id="acc-text">Accuracy: 100%</div>
                <div id="time-left">00:00</div>
            </div>
            <div class="lanes-container">
                <div class="lane" onmousedown="tapLane(0)" ontouchstart="tapLane(0)"></div>
                <div class="lane" onmousedown="tapLane(1)" ontouchstart="tapLane(1)"></div>
                <div class="lane" onmousedown="tapLane(2)" ontouchstart="tapLane(2)"></div>
                <div class="lane" onmousedown="tapLane(3)" ontouchstart="tapLane(3)"></div>
            </div>
            <div class="judge-line"></div>
            <div id="judge-fx" class="judge-feedback"></div>
            <div id="start-screen" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:200; display:flex; align-items:center; justify-content:center; flex-direction:column; color:white; border-radius:20px;">
                <p id="countdown-text" style="font-size:24px; margin-bottom:20px; font-weight:bold;">準備進入現場...</p>
                <button id="start-btn" class="action-btn" onclick="initMusicGame()">進入演唱會</button>
            </div>
        </div>
    `;
}

function initMusicGame() {
    const btn = document.getElementById('start-btn');
    const text = document.getElementById('countdown-text');
    btn.style.display = 'none';

    // 1. 初始化音軌
    rhythmAudio = new Audio('八三夭音樂.mp4');

    // 2. 當音樂元數據載入後，才開始生成譜面與倒數
    rhythmAudio.onloadedmetadata = function () {
        const durationMs = rhythmAudio.duration * 1000;
        const bpm = 109; // 修正後的精確 BPM
        const beat = 60000 / bpm;
        noteChart = [];

        const GLOBAL_OFFSET = 180;

        // 一拍一個音符：同步歌曲節奏
        const firstBeatOffset = 2100;
        for (let t = firstBeatOffset; t < (durationMs - 1500); t += beat) {
            noteChart.push({
                hitTime: t + GLOBAL_OFFSET,
                lane: Math.floor(Math.random() * 4),
                spawned: false
            });
        }

        // 紀錄總音符數，用於 0% 累加制計分
        rhythmStats.maxPossibleScore = noteChart.length;

        // 3. 倒數啟動
        let count = 3;
        const cd = setInterval(() => {
            text.innerText = count > 0 ? count : "LIVE!";
            text.style.fontSize = "60px";
            count--;
            if (count < -1) {
                clearInterval(cd);
                document.getElementById('start-screen').remove();
                rhythmAudio.play();
                updateRhythmFrame();
            }
        }, 800);
    };

    // 如果瀏覽器沒能立即觸發 metadata (快取問題)，手動觸發載入
    rhythmAudio.load();
}

function updateRhythmFrame() {
    if (!rhythmAudio) return;

    // 單一時間源: 音軌當前毫秒數
    const currentTime = rhythmAudio.currentTime * 1000;

    // 檢查產出
    noteChart.forEach(note => {
        if (!note.spawned && currentTime >= note.hitTime - TRAVEL_TIME) {
            note.spawned = true;
            spawnNoteDOM(note);
        }
    });

    // 更新現有音符位置
    const lanes = document.querySelectorAll('.lane');
    activeNotes = activeNotes.filter(note => {
        const progress = (currentTime - (note.hitTime - TRAVEL_TIME)) / TRAVEL_TIME;
        const y = progress * JUDGE_LINE_Y;

        note.el.style.top = y + 'px';

        // MISS 判定 (極致放寬至 400ms，絕對不會無故 Miss)
        if (currentTime > note.hitTime + 400 && !note.judged) {
            note.judged = true;
            note.el.style.opacity = '0.3';
            rhythmStats.miss++;
            rhythmStats.total++;
            showJudgeEffect("MISS", "judge-miss");
            setTimeout(() => note.el.remove(), 200);
            return false;
        }
        return true;
    });

    // 結算或持續 (動態偵測音樂結束)
    const durationMs = rhythmAudio.duration * 1000;
    if (currentTime < (durationMs - 500) && !rhythmAudio.paused) {
        rhythmGameLoop = requestAnimationFrame(updateRhythmFrame);
    } else {
        // 音樂結束或手動暫停，進入結算
        setTimeout(finishRhythmGame, 1000);
    }
}

function spawnNoteDOM(noteData) {
    const lanes = document.querySelectorAll('.lane');
    const el = document.createElement('div');
    el.className = 'note';
    lanes[noteData.lane].appendChild(el);
    activeNotes.push({ ...noteData, el, judged: false });
}

function tapLane(laneIndex) {
    if (!rhythmAudio) return;
    const currentTime = rhythmAudio.currentTime * 1000;

    // 尋找該軌道最接近點擊點的音符 (豪邁放寬到 ±450ms 內)
    const target = activeNotes.find(n => n.lane === laneIndex && !n.judged && Math.abs(currentTime - n.hitTime) < 450);

    if (target) {
        const diff = Math.abs(currentTime - target.hitTime);
        target.judged = true;
        target.el.remove();
        rhythmStats.total++;

        // 超佛系判定標準
        if (diff <= 150) { // Perfect 從 100ms 放寬到 150ms
            rhythmStats.perfect++;
            showJudgeEffect("PERFECT", "judge-perfect");
        } else if (diff <= 350) { // Good 從 250ms 放寬到 350ms
            rhythmStats.good++;
            showJudgeEffect("GOOD", "judge-good");
        } else {
            rhythmStats.miss++;
            showJudgeEffect("MISS", "judge-miss");
        }
        updateScoreUI();
    }
}

function showJudgeEffect(text, className) {
    const fx = document.getElementById('judge-fx');
    fx.innerText = text;
    fx.className = "judge-feedback " + className;
}

function updateScoreUI() {
    // 0% 累加制：(Perfect*1 + Good*0.6) / 總音符數
    const score = (rhythmStats.perfect * 1 + rhythmStats.good * 0.6);
    const acc = rhythmStats.maxPossibleScore === 0 ? 0 : Math.floor((score / rhythmStats.maxPossibleScore) * 100);
    document.getElementById('acc-text').innerText = `Progress: ${acc}%`;
}

function finishRhythmGame() {
    if (rhythmAudio) { rhythmAudio.pause(); rhythmAudio = null; }

    const score = (rhythmStats.perfect * 1 + rhythmStats.good * 0.6);
    const acc = rhythmStats.maxPossibleScore === 0 ? 0 : Math.floor((score / rhythmStats.maxPossibleScore) * 100);

    if (acc >= 75) {
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 10px;">
                <div style="font-size: 50px; margin-bottom: 15px;">🎤</div>
                <h2 style="color: #4a403a; margin-bottom: 10px; text-wrap: balance;">節奏感滿分！</h2>
                <div style="margin: 15px 0;">
                    <img src="photo_concert.jpg" style="width: 100%; border-radius: 12px; border: 5px solid white; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
                </div>
                <p style="color: #888; margin-bottom: 20px; text-wrap: balance;">妳成功達到了 ${acc}% 的準確率！獲得第三張回憶照片！</p>
                <button class="action-btn" onclick="completeLevel(3)">獲得照片並存入相本</button>
            </div>
        `;
    } else {
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 30px 10px;">
                <div style="font-size: 80px; margin-bottom: 20px;">💔</div>
                <h2 style="color: #e63946; margin-bottom: 10px; text-wrap: balance;">再加把勁！</h2>
                <p style="color: #888; text-wrap: balance;">準確率為 ${acc}%，離 75% 的目標還差一點點，再試一次吧！</p>
                <button class="action-btn" style="margin-top: 30px; background: #e63946;" onclick="renderLevel3()">重新開始</button>
            </div>
        `;
    }
}

let fishBGM = null;
function renderLevel1() {
    fishScore = 0; timeLeft = 30;
    modalBody.innerHTML = `
        <div style="text-align:center;">
             <h2 style="color: #1e5799;">🐟 墾丁潛水抓魚</h2>
             <div class="underwater-scene" id="game-container">
                 <div class="game-hud">
                     <div>已抓魚數: <span id="score-val">0</span>/15</div>
                     <div>剩餘時間: <span id="time-val">30</span>s</div>
                 </div>
                 <div class="coral-bg"><div class="seaweed" style="height: 50px; animation-delay: 0.2s"></div><div class="coral">🪸</div><div class="seaweed" style="height: 35px; animation-delay: 0.5s"></div><div class="coral" style="font-size: 30px; transform: scaleX(-1);">🪸</div><div class="seaweed" style="height: 45px; animation-delay: 0s"></div><div class="coral">🐚</div></div><div id="start-screen-1" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:200; display:flex; align-items:center; justify-content:center; flex-direction:column; color:white; border-radius: 25px;"><p style="margin-bottom:20px; font-weight: bold; letter-spacing: 2px;">Ready to Dive?</p><button class="action-btn" onclick="realStartLevel1()">開始潛水</button></div>
             </div>
        </div>`;
}
function realStartLevel1() {
    document.getElementById('start-screen-1').remove();
    try { fishBGM = new Audio('https://assets.mixkit.co/active_storage/sfx/1126/1126-preview.mp3'); fishBGM.loop = true; fishBGM.volume = 0.5; fishBGM.play().catch(e => { }); } catch (e) { }
    startFishLoop(document.getElementById('game-container'));
}

let fishGameInterval = null, fishSpawnInterval = null, bubbleInterval = null;
let fishScore = 0, timeLeft = 30;
function startFishLoop(container) {
    fishGameInterval = setInterval(() => { timeLeft--; document.getElementById('time-val').innerText = timeLeft; if (timeLeft <= 0) endGame(false); }, 1000);
    fishSpawnInterval = setInterval(() => { if (Math.random() > 0.4) createFish(container); }, 800);
    bubbleInterval = setInterval(() => createBubble(container), 1200);
    for (let i = 0; i < 5; i++) createFish(container);
}
function createFish(container) {
    const fishes = ['🐟', '🐠', '🐡', '🐙', '🦑'];
    const fish = document.createElement('div');
    fish.className = 'fish-sprite';
    fish.innerText = fishes[Math.floor(Math.random() * fishes.length)];
    const size = 20 + Math.random() * 25, speed = 2 + Math.random() * 4, fromLeft = Math.random() > 0.5, startY = 50 + Math.random() * 250;
    fish.style.setProperty('--size', size + 'px');
    fish.style.top = startY + 'px';
    fish.style.left = fromLeft ? '-50px' : '110%';
    container.appendChild(fish);
    let pos = fromLeft ? -50 : container.offsetWidth;
    const move = setInterval(() => { if (fromLeft) { pos += speed; fish.style.left = pos + 'px'; fish.style.transform = "scaleX(-1)"; if (pos > container.offsetWidth + 50) cleanup(); } else { pos -= speed; fish.style.left = pos + 'px'; fish.style.transform = "scaleX(1)"; if (pos < -50) cleanup(); } }, 30);
    function cleanup() { clearInterval(move); if (fish.parentNode) fish.remove(); }
    fish.onclick = (e) => { e.stopPropagation(); fishScore++; document.getElementById('score-val').innerText = fishScore; showNet(e.clientX, e.clientY, true); cleanup(); if (fishScore >= 15) endGame(true); };
}
function createBubble(container) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const size = 5 + Math.random() * 15;
    bubble.style.width = size + 'px'; bubble.style.height = size + 'px'; bubble.style.left = Math.random() * 100 + '%';
    bubble.style.setProperty('--duration', (5 + Math.random() * 5) + 's');
    container.appendChild(bubble);
    setTimeout(() => bubble.remove(), 10000);
}
function showNet(x, y, success) {
    const net = document.createElement('div');
    net.className = `net-effect ${success ? '' : 'fail'}`;
    const rect = document.getElementById('game-container').getBoundingClientRect();
    net.style.left = (x - rect.left - 30) + 'px'; net.style.top = (y - rect.top - 30) + 'px';
    document.getElementById('game-container').appendChild(net);
    setTimeout(() => net.remove(), 300);
}
function endGame(success) {
    if (fishBGM) { fishBGM.pause(); fishBGM = null; }
    clearInterval(fishGameInterval); clearInterval(fishSpawnInterval); clearInterval(bubbleInterval);
    if (success) { completeLevel(1); } else {
        modalBody.innerHTML = `<div style="text-align: center; padding: 30px 10px;"><div style="font-size: 80px; margin-bottom: 20px;">⏰</div><h2 style="color: #e63946; margin-bottom: 10px;">魚群跑掉啦～</h2><p style="color: #888;">別擔心，再試一次吧！</p><button class="action-btn" style="margin-top: 30px; background: #e63946;" onclick="renderLevel1()">重新開始</button></div>`;
    }
}

// ==========================================
// 【第四關：回憶拼圖 - 大阪京都】
// ==========================================
let puzzlePieces = [];
let draggingPiece = null;

function renderLevel4() {
    const photo = gameState.photos[4];
    modalBody.innerHTML = `
        <div style="text-align: center; margin-bottom: 10px;">
            <h2 style="color: #4a403a;">🖼️ 那段漫步京都的時光</h2>
            <p style="font-size: 12px; color: #888;">將記憶碎片拼回正確的位置 (4x5)</p>
        </div>
        <div class="puzzle-scene">
            <div class="puzzle-bg-blur" style="background-image: url('${photo.url}')"></div>
            <div class="puzzle-board" id="puzzle-board"></div>
        </div>
    `;

    const board = document.getElementById('puzzle-board');
    const rows = 5;
    const cols = 4;
    const pieceWidth = 65;
    const pieceHeight = 92.4;
    puzzlePieces = [];

    // 1. 生成碎片資料
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            puzzlePieces.push({
                id: r * cols + c,
                correctR: r,
                correctC: c,
                currentR: r,
                currentC: c,
                snapped: false
            });
        }
    }

    // 2. 隨機打亂位置 (確保不一開始就全部在正確位置)
    shufflePuzzle();

    // 3. 渲染碎片
    renderPieces();
}

function shufflePuzzle() {
    // 簡單的洗牌算法
    for (let i = puzzlePieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tempR = puzzlePieces[i].currentR;
        const tempC = puzzlePieces[i].currentC;
        puzzlePieces[i].currentR = puzzlePieces[j].currentR;
        puzzlePieces[i].currentC = puzzlePieces[j].currentC;
        puzzlePieces[j].currentR = tempR;
        puzzlePieces[j].currentC = tempC;
    }
    // 初始檢查是否有人剛好在正確位置
    puzzlePieces.forEach(p => {
        if (p.currentR === p.correctR && p.currentC === p.correctC) p.snapped = true;
        else p.snapped = false;
    });
}

function renderPieces() {
    const board = document.getElementById('puzzle-board');
    board.innerHTML = '';
    const photo = gameState.photos[4];

    puzzlePieces.forEach(p => {
        const el = document.createElement('div');
        el.className = `puzzle-piece ${p.snapped ? 'snapped' : ''}`;
        el.style.backgroundImage = `url('${photo.url}')`;
        el.style.backgroundPosition = `-${p.correctC * 65}px -${p.correctR * 92.4}px`;

        // 視覺位置
        el.style.left = (p.currentC * 65) + 'px';
        el.style.top = (p.currentR * 92.4) + 'px';

        if (!p.snapped) {
            el.draggable = true;
            el.addEventListener('mousedown', (e) => startDrag(e, p));
            el.addEventListener('touchstart', (e) => startDrag(e, p), { passive: false });
        }

        board.appendChild(el);
        p.el = el;
    });
}

function startDrag(e, piece) {
    e.preventDefault();
    draggingPiece = piece;
    const el = piece.el;

    let startX = e.clientX || e.touches[0].clientX;
    let startY = e.clientY || e.touches[0].clientY;
    let origLeft = parseFloat(el.style.left);
    let origTop = parseFloat(el.style.top);

    function onMove(me) {
        let curX = me.clientX || me.touches[0].clientX;
        let curY = me.clientY || me.touches[0].clientY;
        el.style.left = (origLeft + (curX - startX)) + 'px';
        el.style.top = (origTop + (curY - startY)) + 'px';
    }

    function onEnd(ee) {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onEnd);

        // 判定落點 (修正：使用 floor 確保落在手指指向的格子，避免亂跳)
        const board = document.getElementById('puzzle-board').getBoundingClientRect();
        const dropX = (ee.clientX || (ee.changedTouches && ee.changedTouches[0].clientX)) - board.left;
        const dropY = (ee.clientY || (ee.changedTouches && ee.changedTouches[0].clientY)) - board.top;

        const targetC = Math.floor(dropX / 65);
        const targetR = Math.floor(dropY / 92.4);

        if (targetC >= 0 && targetC < 4 && targetR >= 0 && targetR < 5) {
            // 嘗試跟目標位置的碎片交換
            const otherPiece = puzzlePieces.find(pp => pp.currentR === targetR && pp.currentC === targetC && pp !== draggingPiece);

            if (otherPiece && !otherPiece.snapped) {
                // 交換位置
                const oldR = draggingPiece.currentR;
                const oldC = draggingPiece.currentC;
                draggingPiece.currentR = targetR;
                draggingPiece.currentC = targetC;
                otherPiece.currentR = oldR;
                otherPiece.currentC = oldC;
            } else if (!otherPiece) {
                // 移動到空位
                draggingPiece.currentR = targetR;
                draggingPiece.currentC = targetC;
            }
        }

        // 檢查吸附 (修正：全域檢查每塊碎片是否回到正確位置)
        puzzlePieces.forEach(p => {
            if (!p.snapped && p.currentR === p.correctR && p.currentC === p.correctC) {
                p.snapped = true;
                // 我們可以不在這裡 showFeedback，避免一次跳多個，統一由 checkPuzzleComplete 處理
            }
        });

        renderPieces();
        checkPuzzleComplete();
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
}

function checkPuzzleComplete() {
    if (puzzlePieces.every(p => p.snapped)) {
        const board = document.getElementById('puzzle-board');
        board.classList.add('puzzle-complete-anim');
        setTimeout(() => {
            showSuccessLevel4();
        }, 1500);
    }
}

function showSuccessLevel4() {
    const photo = gameState.photos[4];
    modalBody.innerHTML = `
        <div style="text-align: center; padding: 10px;">
            <div style="font-size: 50px; margin-bottom: 15px;">⛩️</div>
            <h2 style="color: #4a403a; margin-bottom: 10px;">拼湊出完整的京都了！</h2>
            <div style="margin: 15px 0;">
                <img src="${photo.url}" style="width: 100%; border-radius: 12px; border: 5px solid white; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
            </div>
            <p style="color: #888; margin-bottom: 20px;">找回這一段慢活的漫步時光 ✨</p>
            <button class="action-btn" onclick="completeLevel(4)">收起拼圖並存入相本</button>
        </div>
    `;
}
// ==========================================
// 【第二關：澎湖海邊找回憶 - 大家來找碴】
// ==========================================
function renderLevel2() {
    let foundCount = 0;
    const totalDiffs = 5;
    const photo = gameState.photos[2];
    modalBody.innerHTML = `
        <div style="text-align: center; margin-bottom: 10px;">
            <h2 style="color: #246fa8;">📸 澎湖海邊找回憶</h2>
            <p class="game-info" id="diff-info">找出下方美景中 5 處消失的細節！ (0/5)</p>
        </div>
        <div class="spot-diff-container">
            <div class="diff-image-wrapper">
                <img src="penghu_bg.png" class="diff-image">
                <div style="position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.5); color:white; padding:2px 6px; border-radius:5px; font-size:9px;">原始風景</div>
            </div>
            <div class="diff-image-wrapper" id="target-wrapper">
                <img src="penghu_bg.png" class="diff-image" style="opacity: 1;">
                <div style="position:absolute; top:5px; right:5px; background:rgba(255,71,87,0.8); color:white; padding:2px 6px; border-radius:5px; font-size:9px;">找回細節</div>
                
                <!-- 差異點 1: 燈塔星光 -->
                <div class="diff-target" style="top: 30%; left: 42%; width:30px; height:30px;" onclick="foundDiff(this, 1)">
                    <span style="font-size: 15px; opacity: 0.6;" class="diff-icon">✨</span>
                </div>
                <!-- 差異點 2: 船板螃蟹 -->
                <div class="diff-target" style="top: 75%; left: 16%; width:35px; height:35px;" onclick="foundDiff(this, 2)">
                    <span style="font-size: 15px; opacity: 0.6;" class="diff-icon">🦀</span>
                </div>
                <!-- 差異點 3: 雲中海鷗 -->
                <div class="diff-target" style="top: 5%; left: 78%; width:35px; height:35px;" onclick="foundDiff(this, 3)">
                    <span style="font-size: 15px; opacity: 0.6;" class="diff-icon">🕊️</span>
                </div>
                <!-- 差異點 4: 沙灘皮球 -->
                <div class="diff-target" style="top: 65%; left: 66%; width:35px; height:35px;" onclick="foundDiff(this, 4)">
                    <span style="font-size: 15px; opacity: 0.6;" class="diff-icon">⚽</span>
                </div>
                <!-- 差異點 5: 小屋黑貓 -->
                <div class="diff-target" style="top: 34%; left: 84%; width:30px; height:30px;" onclick="foundDiff(this, 5)">
                    <span style="font-size: 15px; opacity: 0.6;" class="diff-icon">🐱</span>
                </div>
            </div>
        </div>
    `;

    window.foundDiff = function (el, index) {
        if (el.dataset.found === "true") return;
        el.dataset.found = "true";
        foundCount++;

        const icon = el.querySelector('.diff-icon');
        if (icon) icon.style.opacity = '1';

        const mark = document.createElement('div');
        mark.className = 'found-mark';
        mark.style.top = (parseFloat(el.style.top) - 2) + '%';
        mark.style.left = (parseFloat(el.style.left) - 1) + '%';
        mark.style.width = el.offsetWidth + 'px';
        mark.style.height = el.offsetHeight + 'px';
        document.getElementById('target-wrapper').appendChild(mark);

        document.getElementById('diff-info').innerText = `找出下方美景中 5 處消失的細節！ (${foundCount}/5)`;

        if (foundCount >= totalDiffs) {
            setTimeout(() => { showSuccessLevel2(); }, 800);
        }
    };
}

function showSuccessLevel2() {
    const photo = gameState.photos[2];
    modalBody.innerHTML = `
        <div style="text-align: center; padding: 10px;">
            <div style="font-size: 50px; margin-bottom: 10px;">🤩</div>
            <h2 style="color: #4a403a; margin-bottom: 10px;">細節都被妳發現了！</h2>
            <div style="margin: 15px 0;">
                <img src="${photo.url}" style="width: 100%; border-radius: 12px; border: 5px solid white; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
            </div>
            <p style="color: #888; margin-bottom: 20px;">找回這張乘風破浪的合照 ✨</p>
            <button class="action-btn" onclick="completeLevel(2)">收起照片並存入相本</button>
        </div>
    `;
}

// 通用：完成關卡
function completeLevel(num) {
    const photo = gameState.photos[num];
    if (photo.collected) return;

    // 1. 同步數據
    photo.collected = true;
    gameState.collectedCount++;

    // 2. 查找並更新頂部槽位
    const slot = document.getElementById(`photo-slot-${num}`);
    if (slot) {
        slot.style.backgroundImage = `url('${photo.url}')`;
        slot.style.backgroundSize = "cover";
        slot.classList.add('filled');
        slot.innerText = "";
        // 添加成功收錄的微光
        slot.style.boxShadow = "0 0 15px rgba(240, 98, 146, 0.8)";
    }

    // 3. 關閉當前彈窗，讓玩家看到主機畫面更新
    closeModal();

    // 4. 更新進度顯示
    showFeedback(`獲得回憶照片 ${num} ✨`);

    // 【新增：循序級解鎖邏輯】
    const nextNum = num === 1 ? 2 : (num === 2 ? 3 : (num === 3 ? 4 : null));
    if (nextNum) {
        const nextHotspot = document.getElementById(`hotspot-${nextNum}`);
        if (nextHotspot) {
            nextHotspot.style.display = 'flex';
            // 給玩家一點提示
            setTimeout(() => {
                showFeedback(`新線索已出現...`);
            }, 500);
        }
    }

    // 5. 結局邏輯處理
    if (gameState.collectedCount === 4) {
        // 解鎖筆記本亮點並啟動強烈發光
        const nbArea = document.getElementById('final-notebook-area');
        if (nbArea) {
            nbArea.style.display = 'flex';
            nbArea.classList.add('ready');
        }

        setTimeout(() => {
            showFinalUnlockMessage();
        }, 1200);
    } else {
        // 非最後一張，如果是第一關就自動開預覽，其他關卡直接回房間
        if (num === 1) { showPhotoPreview(1); }
    }
}
function showFinalUnlockMessage() {
    modalBody.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 80px; margin-bottom: 20px; animation: bounce 2s infinite;">💖</div>
            <h2 style="color: #4a403a; margin-bottom: 15px; text-wrap: balance;">所有的回憶都找齊了</h2>
            <p style="color: #666; line-height: 1.8; margin-bottom: 30px; word-break: keep-all; text-wrap: balance;">
                妳成功拼湊出了這一段珍貴的旅程<br>
                <b>妳的專屬回憶書已經解鎖了</b><br>
                <span style="font-size: 16px; color: #e63946; font-weight: bold; background: #fff5f5; padding: 5px 15px; border-radius: 50px; border: 1px dashed #e63946; display: inline-block; margin-top: 10px;">
                    解鎖密碼：0427
                </span>
            </p>
            <button class="action-btn" onclick="closeModal(); document.getElementById('progress-text').innerText='✨ 回憶已完整，點擊回憶書輸入 0427 吧';">立即前往</button>
        </div>
    `;
    modalOverlay.style.display = 'flex';
}
let currentPin = "";
function handleNotebookClick() {
    if (gameState.collectedCount < 4) {
        showFeedback(`這裡還鎖著... 需要找回 4 張回憶照片。`);
    } else {
        renderNotebookLock();
    }
}

function renderNotebookLock() {
    currentPin = "";
    modalBody.innerHTML = `
        <div style="text-align: center; padding: 10px;">
            <div style="font-size: 50px; margin-bottom: 10px;">📔</div>
            <h2 style="color: #4a403a; margin-bottom: 5px;">加密的回憶筆記本</h2>
            <p style="color: #888; font-size: 13px; margin-bottom: 20px;">請輸入 4 位數密碼解鎖</p>
            
            <div id="pin-display" style="font-size: 32px; letter-spacing: 15px; background: #eee; padding: 15px; border-radius: 12px; margin-bottom: 20px; height: 65px; display: flex; align-items: center; justify-content: center; color: #4a403a; font-weight: bold;">
                ____
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 200px; margin: 0 auto;">
                ${[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "OK"].map(val => `
                    <button class="pin-btn" onclick="pressPin('${val}')" style="padding: 15px; font-size: 18px; border: 1px solid #ddd; border-radius: 10px; background: white; cursor: pointer;">${val}</button>
                `).join('')}
            </div>
        </div>
    `;
    modalOverlay.style.display = 'flex';
}

function pressPin(val) {
    const display = document.getElementById('pin-display');
    if (val === 'C') {
        currentPin = "";
    } else if (val === 'OK') {
        checkPin();
        return;
    } else {
        if (currentPin.length < 4) currentPin += val;
    }

    // 更新顯示 (遮罩效果)
    display.innerText = currentPin.padEnd(4, "_");

    // 自動檢查 (如果輸滿 4 位也可以自動跳轉)
    if (currentPin.length === 4) {
        setTimeout(checkPin, 600);
    }
}

// ==========================================
// 【最終驚喜：8 頁回憶書引擎】
// ==========================================
const memoryPages = [
    {
        text: "哈嘍陳儀雯小寶寶\n祝福妳26歲生日快樂喔！！\n還有即將到來的五週年快樂欸！！\n\n謝謝妳變成我的北鼻\n我最大的願望\n就是希望妳能過得開心\n\n這一年的時間\n也是過得很充實很開心\n\n謝謝妳讓我有這麼多回憶",
        img: "p1.jpg"
    },
    { text: "第一次和妳去墾丁\n在恆春吃新鮮的生魚片\n做了特別的珍珠項鏈\n在小狗灣找寄居蟹\n最後終於帶妳體驗到潛水\n雖然在海底真的蠻恐怖的\n但能用不同視角看到海底生物\n真的很特別", img: "p2.jpg" },
    { text: "第一次和妳到澎湖\n遇到很友善的民宿老闆\n還送了她兩瓶東泉辣椒醬\n我們看到好多漂亮的海景\n體驗到第一次的澎湖花火節\n還在海底郵筒寄明信片回台灣\n雖然我們都曬傷曬到很誇張\n但澎湖真的很好玩喔！！", img: "p3.jpg" },
    { text: "每年都要看的八三夭\n這次跑來高雄巨蛋\n為了排拍貼機差點趕不上開場\n還好很幸運的在最後一刻趕上\n這次八三夭一樣很棒喔\n還有聽到新歌\n而且我們這次第一次吃旭集\n吃一大堆螃蟹還有喝好多調酒\n也是蠻好笑的", img: "p4.jpg" },
    { text: "我們去大阪京都的五天四夜\n京都我們只排一天\n但竟然奇蹟的都去到想去的景點\n伏見稻荷、清水寺、下鴨神社\n還有最漂亮的金閣寺\n也吃到想吃的moritaya壽喜燒\n還有穿到好看的和服拍照\n妳穿和服真的超級漂亮喔！！", img: "p5.jpg" },
    { text: "我們在大阪\n去了大阪城拍柯南照片\n在道頓堀跟一堆人逛街\n還有去勝尾寺找達摩拍照\n最後到難波八阪神社\n每天大爆走加大爆買\n真的是把免稅當免費欸", img: "p6.jpg" },
    { text: "跟妳在一起這麼久\n雖然常常在說時間過得好快\n但回頭看我們在一起的時光\n這些照片這些回憶\n都會讓我陷入當時的感覺\n我們過得很充實也很開心\n謝謝妳願意陪我跟我在一起\n而且這一年我辭職很迷茫\n沒有催我要趕快找工作\n反而是鼓勵我\n去找自己喜歡的工作\n謝謝妳對我這麼好", img: "p7.jpg" },
    { text: "最後再祝妳生日快樂我的北鼻\n未來每年的生日我都會繼續陪妳\n有任何事情都可以跟我說\n我會抱抱妳安慰妳鼓勵妳\n永遠支持著妳的\n希望妳每天都能開心快樂\n看到妳的笑容我就會很開心了\n我愛妳喔儀雯寶嘟❤️", img: "p8.jpg" }
];

let currentMemoryIndex = 0;

function openMemoryBook() {
    currentMemoryIndex = 0;
    updateBookPage();
    document.getElementById('card-book-overlay').style.display = 'flex';
}

function updateBookPage() {
    const pageData = memoryPages[currentMemoryIndex];
    const pageContainer = document.getElementById('book-page');
    const textEl = document.getElementById('book-text');
    const imgEl = document.getElementById('book-img');
    const indicatorEl = document.getElementById('book-page-indicator');

    // 移除現有動畫標籤強迫重新進場
    pageContainer.classList.remove('active');

    setTimeout(() => {
        textEl.innerText = pageData.text;
        imgEl.src = pageData.img;
        indicatorEl.innerText = `${currentMemoryIndex + 1} / 8`;
        pageContainer.classList.add('active');
    }, 100);
}

function nextPage() {
    if (currentMemoryIndex < memoryPages.length - 1) {
        currentMemoryIndex++;
        updateBookPage();
    }
}

function prevPage() {
    if (currentMemoryIndex > 0) {
        currentMemoryIndex--;
        updateBookPage();
    }
}

function closeBook() {
    document.getElementById('card-book-overlay').style.display = 'none';
}

function checkPin() {
    const CORRECT_PIN = "0427";
    if (currentPin === CORRECT_PIN) {
        showFeedback("密碼正確！正在開啟回憶書...");
        setTimeout(() => {
            closeModal();
            openMemoryBook();
        }, 800);
    } else {
        showFeedback("密碼錯誤，請輸入 0427 哦！");
        currentPin = "";
        document.getElementById('pin-display').innerText = "____";
    }
}

// 通用輔助
function showFeedback(msg) { const toast = document.createElement('div'); toast.style.cssText = `position: fixed; top: 110px; left: 50%; transform: translateX(-50%); background: rgba(163, 145, 113, 0.9); color: white; padding: 10px 25px; border-radius: 50px; font-size: 14px; z-index: 6000; animation: fadeInOut 2s forwards; box-shadow: 0 5px 20px rgba(0,0,0,0.1); pointer-events: none;`; toast.innerText = msg; document.body.appendChild(toast); setTimeout(() => toast.remove(), 2000); }
function closeModal() { if (fishBGM) { fishBGM.pause(); fishBGM = null; } if (rhythmAudio) { rhythmAudio.pause(); rhythmAudio = null; } clearInterval(fishGameInterval); clearInterval(fishSpawnInterval); clearInterval(bubbleInterval); modalOverlay.style.display = 'none'; }
function closeFinal() { closeBook(); }

const styleTag = document.createElement('style');
styleTag.innerHTML = `@keyframes fadeInOut { 0% { opacity: 0; transform: translate(-50%, 15px); } 20% { opacity: 1; transform: translate(-50%, 0); } 80% { opacity: 1; transform: translate(-50%, 0); } 100% { opacity: 0; transform: translate(-50%, -15px); } }`;
document.head.appendChild(styleTag);
