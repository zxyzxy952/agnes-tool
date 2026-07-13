/* ============================
   Agnes AI 工具箱 — 逻辑脚本
   Safari 兼容版（ES5 语法）
   ============================ */

var BASE = "https://apihub.agnes-ai.com";

/* ---------- 弹窗控制 ---------- */
function openTutorial() {
    document.getElementById('tutorialModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}
function closeTutorial() {
    document.getElementById('tutorialModal').classList.remove('show');
    document.body.style.overflow = '';
}

/* ---------- Tab 切换 ---------- */
document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
});

/* ---------- 本地图片预览 ---------- */
function previewFile(input, containerId) {
    var c = document.getElementById(containerId);
    var imgOld = c.querySelector('.preview-img');
    if (imgOld) imgOld.remove();
    if (input.files[0]) {
        var img = document.createElement('img');
        img.className = 'preview-img';
        img.src = URL.createObjectURL(input.files[0]);
        c.appendChild(img);
        c.querySelector('span').textContent = '已选择: ' + input.files[0].name;
    }
}

/* ---------- 文件转 base64 ---------- */
function fileToBase64(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) { resolve(e.target.result); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/* ---------- HTML 转义防 XSS ---------- */
function escHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

/* ========== 对话功能 ========== */
var chatHistory = [];

function sendChat() {
    var key   = document.getElementById('apiKey').value.trim();
    var input = document.getElementById('chatInput');
    var text  = input.value.trim();
    if (!key || !text) return;

    var msgsEl = document.getElementById('chatMsgs');
    msgsEl.innerHTML += '<div class="chat-msg user"><div class="bubble">' + escHtml(text) + '</div></div>';
    chatHistory.push({ role: "user", content: text });
    input.value = '';

    var loadId = 'load-' + Date.now();
    msgsEl.innerHTML += '<div class="chat-msg assistant" id="' + loadId + '"><div class="bubble"><span class="status">思考中...</span></div></div>';
    msgsEl.scrollTop = msgsEl.scrollHeight;

    fetch(BASE + '/v1/chat/completions', {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "agnes-2.0-flash",
            messages: [{ role: "system", content: "你是 Agnes AI 助手，友好、专业、简洁地回答用户问题。" }].concat(chatHistory),
            temperature: 0.7,
            max_tokens: 2048
        })
    }).then(function(res) { return res.json(); }).then(function(data) {
        var loadEl = document.getElementById(loadId);
        if (data.choices && data.choices[0]) {
            var reply = data.choices[0].message.content;
            chatHistory.push({ role: "assistant", content: reply });
            loadEl.querySelector('.bubble').innerHTML = escHtml(reply);
        } else {
            loadEl.querySelector('.bubble').innerHTML = '<span class="error">出错：' + escHtml((data.error && data.error.message) || JSON.stringify(data)) + '</span>';
        }
        msgsEl.scrollTop = msgsEl.scrollHeight;
    }).catch(function(e) {
        document.getElementById(loadId).querySelector('.bubble').innerHTML = '<span class="error">错误：' + escHtml(e.message) + '</span>';
        msgsEl.scrollTop = msgsEl.scrollHeight;
    });
}

/* ========== 文生图 ========== */
function genTxtImg() {
    var key     = document.getElementById('apiKey').value.trim();
    var prompt  = document.getElementById('imgPrompt').value.trim();
    var ratio   = document.getElementById('imgRatio').value;
    var quality = document.getElementById('imgQuality').value;
    var resBox  = document.getElementById('imgResult');

    if (!key || !prompt) {
        resBox.innerHTML = '<span class="error">请填写 API Key 和描述词</span>';
        return;
    }
    resBox.innerHTML = '<span class="status">图片生成中，请稍候...</span>';

    fetch(BASE + '/v1/images/generations', {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "agnes-image-2.0-flash",
            prompt: prompt,
            ratio: ratio,
            quality: quality,
            extra_body: { response_format: "url" }
        })
    }).then(function(res) { return res.json(); }).then(function(data) {
        if (data.data && data.data[0] && data.data[0].url) {
            resBox.innerHTML = '<img src="' + data.data[0].url + '" alt="生成图片">';
        } else {
            resBox.innerHTML = '<span class="error">生成失败：' + escHtml((data.error && data.error.message) || JSON.stringify(data)) + '</span>';
        }
    }).catch(function(e) {
        resBox.innerHTML = '<span class="error">请求失败：' + escHtml(e.message) + '</span>';
    });
}

/* ========== 图生图 ========== */
function genImgImg() {
    var key       = document.getElementById('apiKey').value.trim();
    var prompt    = document.getElementById('img2imgPrompt').value.trim();
    var ratio     = document.getElementById('img2imgRatio').value;
    var quality   = document.getElementById('img2imgQuality').value;
    var fileInput = document.getElementById('imgFile');
    var resBox    = document.getElementById('img2imgResult');

    if (!key) {
        resBox.innerHTML = '<span class="error">请先填写 API Key</span>';
        return;
    }
    if (!fileInput.files[0]) {
        resBox.innerHTML = '<span class="error">请先上传一张参考图片</span>';
        return;
    }
    resBox.innerHTML = '<span class="status">图生图处理中...</span>';

    fileToBase64(fileInput.files[0]).then(function(base64) {
        return fetch(BASE + '/v1/images/generations', {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + key,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "agnes-image-2.0-flash",
                prompt: prompt || "编辑这张图片",
                ratio: ratio,
                quality: quality,
                extra_body: { image: [base64], response_format: "url" }
            })
        });
    }).then(function(res) { return res.json(); }).then(function(data) {
        if (data.data && data.data[0] && data.data[0].url) {
            resBox.innerHTML = '<img src="' + data.data[0].url + '" alt="图生图结果">';
        } else {
            resBox.innerHTML = '<span class="error">生成失败：' + escHtml((data.error && data.error.message) || JSON.stringify(data)) + '</span>';
        }
    }).catch(function(e) {
        resBox.innerHTML = '<span class="error">请求失败：' + escHtml(e.message) + '</span>';
    });
}

/* ========== 文生视频 ========== */
function genTxtVideo() {
    var key      = document.getElementById('apiKey').value.trim();
    var prompt   = document.getElementById('vidPrompt').value.trim();
    var ratio    = document.getElementById('vidRatio').value;
    var frames   = Number(document.getElementById('vidFrames').value);
    var duration = Number(document.getElementById('vidDuration').value);
    var resBox   = document.getElementById('vidResult');

    if (!key || !prompt) {
        resBox.innerHTML = '<span class="error">请填写 API Key 和视频描述</span>';
        return;
    }
    resBox.innerHTML = '<span class="status">提交视频生成任务...</span>';

    fetch(BASE + '/v1/videos', {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "agnes-video-v2.0",
            prompt: prompt,
            ratio: ratio,
            num_frames: frames,
            duration: duration,
            frame_rate: 24
        })
    }).then(function(res) { return res.json(); }).then(function(data) {
        var taskId = data.video_id || data.id || data.task_id;
        if (taskId) {
            pollVideoTask(key, taskId, resBox);
        } else {
            resBox.innerHTML = '<span class="error">提交失败：' + escHtml((data.error && data.error.message) || JSON.stringify(data)) + '</span>';
        }
    }).catch(function(e) {
        resBox.innerHTML = '<span class="error">请求失败：' + escHtml(e.message) + '</span>';
    });
}

/* ========== 图生视频（单图） ========== */
function genImgVideo() {
    var key      = document.getElementById('apiKey').value.trim();
    var prompt   = document.getElementById('imgVidPrompt').value.trim();
    var ratio    = document.getElementById('imgVidRatio').value;
    var frames   = Number(document.getElementById('imgVidFrames').value);
    var duration = Number(document.getElementById('imgVidDuration').value;
    var fileInput = document.getElementById('vidImgFile');
    var resBox   = document.getElementById('imgVidResult');

    if (!key) {
        resBox.innerHTML = '<span class="error">请先填写 API Key</span>';
        return;
    }
    if (!fileInput.files[0]) {
        resBox.innerHTML = '<span class="error">请先上传一张图片</span>';
        return;
    }
    resBox.innerHTML = '<span class="status">图片上传中...</span>';

    fileToBase64(fileInput.files[0]).then(function(base64) {
        resBox.innerHTML = '<span class="status">提交视频生成任务...</span>';
        return fetch(BASE + '/v1/videos', {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + key,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "agnes-video-v2.0",
                prompt: prompt || "让这张图片动起来",
                ratio: ratio,
                num_frames: frames,
                duration: duration,
                frame_rate: 24,
                image: base64
            })
        });
    }).then(function(res) { return res.json(); }).then(function(data) {
        var taskId = data.video_id || data.id || data.task_id;
        if (taskId) {
            pollVideoTask(key, taskId, resBox);
        } else {
            resBox.innerHTML = '<span class="error">提交失败：' + escHtml((data.error && data.error.message) || JSON.stringify(data)) + '</span>';
        }
    }).catch(function(e) {
        resBox.innerHTML = '<span class="error">请求失败：' + escHtml(e.message) + '</span>';
    });
}

/* ========== 视频轮询 ========== */
function pollVideoTask(key, videoId, resBox, attempt) {
    if (typeof attempt === 'undefined') attempt = 0;
    var waitSec = attempt * 5;
    resBox.innerHTML = '<span class="status">视频渲染中... 已等待 ' + waitSec + ' 秒</span>';

    fetch(BASE + '/agnesapi?video_id=' + videoId, {
        headers: { "Authorization": "Bearer " + key }
    }).then(function(res) { return res.json(); }).then(function(data) {
        if (data.status === 'completed' || data.status === 'SUCCEEDED') {
            var url = data.video_url || data.url || (data.output && data.output.video_url) || (data.data && data.data[0] && data.data[0].url);
            if (url) {
                resBox.innerHTML = '<video controls src="' + url + '"></video>';
            } else {
                resBox.innerHTML = '<span class="success">视频已完成</span>\n' + escHtml(JSON.stringify(data, null, 2));
            }
        } else if (data.status === 'failed' || data.status === 'FAILED') {
            resBox.innerHTML = '<span class="error">视频生成失败：' + escHtml((data.error && data.error.message) || data.message || "未知错误") + '</span>';
        } else {
            setTimeout(function() { pollVideoTask(key, videoId, resBox, attempt + 1); }, 5000);
        }
    }).catch(function(e) {
        if (attempt < 180) {
            setTimeout(function() { pollVideoTask(key, videoId, resBox, attempt + 1); }, 5000);
        } else {
            resBox.innerHTML = '<span class="error">轮询超时</span>';
        }
    });
}

/* ========== 时长-帧数自动联动 ========== */
document.getElementById('vidDuration').addEventListener('change', function() {
    var map = { "2":"49", "4":"73", "5":"121", "8":"177", "10":"241" };
    document.getElementById('vidFrames').value = map[this.value];
});
document.getElementById('imgVidDuration').addEventListener('change', function() {
    var map = { "2":"49", "4":"73", "5":"121", "8":"177", "10":"241" };
    document.getElementById('imgVidFrames').value = map[this.value];
});

/* Safari 触摸反馈修复 */
document.addEventListener('touchstart', function() {}, { passive: true });