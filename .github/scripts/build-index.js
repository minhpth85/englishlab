const fs = require("fs");

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function callGemini(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Phân tích nội dung bài học tiếng Anh sau và trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown \`\`\`json):
  {
    "title": "Tiêu đề tiếng Anh ngắn gọn, súc tích"
  }

  Nội dung bài học:
  ${text.slice(0, 3000)}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    const data = await res.json();
    if (!data.candidates) console.error("Gemini HTTP " + res.status + ": " + JSON.stringify(data).slice(0, 800));
    const reply = data.candidates[0].content.parts[0].text;
    return JSON.parse(reply);
  } catch (err) {
    console.error("AI Error:", err.message);
    return null;
  }
}

async function main() {
  // Lấy tất cả file html trừ index.html
  const files = fs.readdirSync(".").filter(f => f.endsWith(".html") && f !== "index.html" && f !== "chunks.html");
  // Sắp xếp theo thời điểm file được thêm vào repo: mới nhất trước
  const addedAt = f => require("child_process").execSync(
    `git log --diff-filter=A --format=%aI -- "${f}" | tail -1`, { encoding: "utf8" }).trim();
  files.sort((a, b) => addedAt(b).localeCompare(addedAt(a)) || b.localeCompare(a));

  let cardsHtml = "";
  let count = 0;

  for (const file of files) {
    count++;
    const content = fs.readFileSync(file, "utf8");

    // Lọc bỏ mã html để lấy text thô gửi cho AI đọc
    const cleanText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    // Gọi AI đọc và phân tích nội dung
    const aiData = await callGemini(cleanText);

    const title = aiData?.title || file.replace(".html", "").replace(/[-_]/g, " ");

    // 3 chunk đầu tiên: lấy đúng các cụm (phrase) đã khai báo trong bài
    const phrases = [...content.matchAll(/^\s*phrase: "([^"]+)"/gm)].map(m => m[1]).slice(0, 3);
    const chunkItems = phrases.map(p => `      <li lang="en">${escapeHtml(p)}</li>`).join("\n");

    const lessonNo = String(count).padStart(2, "0");
    cardsHtml += `
<!-- Bài ${lessonNo} -->
<article class="hb-card lesson-card">
  <div class="card-top">
    <div class="hb-card-icon">${lessonNo}</div>
    <span class="status status--new">Chưa học</span>
  </div>
  <h3>${escapeHtml(title)}</h3>
  <ul class="chunk-list" aria-label="3 chunk trong bài">
${chunkItems}
  </ul>
  <div class="card-actions">
    <a class="hb-btn hb-btn--primary" href="${escapeHtml(file)}">Học bài này</a>
    <button class="hb-btn hb-btn--secondary done-btn" type="button" data-id="${escapeHtml(file.replace(".html", ""))}" aria-pressed="false">Đánh dấu đã học</button>
  </div>
</article>
`;
  }

  const template = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CHUNKIE · Thư viện chunk</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --white:#ffffff; --bg:#fbfaf5; --bg-alt:#f8f6ea;
  --surface:#ffffff; --surface-soft:#ebf6ee; --surface-inverse:#17301d;
  --ink-900:#171c18; --ink-700:#1f2a22; --ink-500:#505e4f;
  --text-on-inverse:#f4faf6; --text-highlight-inverse:#b8e0c2;
  --primary:#32854d; --primary-hover:#317345; --primary-text:#317345; --focus:#4a9b60;
  --warning-soft:#fbf3e0; --warning-text:#8a6421;
  --green-700:#317345; --green-900:#17301d;
  --border:#e1eae5; --border-strong:#84968a;
  --radius-sm:8px; --radius-md:12px; --radius-lg:20px; --radius-xl:32px; --radius-full:999px;
  --shadow-sm:0 1px 2px rgba(23,48,29,.06);
  --font-sans:"Work Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
[hidden]{display:none !important}
body{font-family:var(--font-sans);font-size:16px;line-height:24px;color:var(--ink-700);background:var(--bg);-webkit-font-smoothing:antialiased}
a{color:inherit}
:focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:var(--radius-sm)}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}

/* Header */
.topbar{position:sticky;top:0;z-index:40;background:rgba(251,250,245,.94);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid var(--border)}
.nav{display:flex;align-items:center;justify-content:space-between;padding:12px 24px}
.brand{font-weight:700;color:var(--ink-900);text-decoration:none;font-size:18px;letter-spacing:-.01em}
.brand span{color:var(--primary-text)}
.nav-links{display:flex;gap:8px}
.nav-btn{padding:8px 16px;font-size:14px;line-height:20px}
[id]{scroll-margin-top:72px}
.nav-links a{text-decoration:none}

/* Buttons */
.hb-btn{display:inline-flex;align-items:center;gap:12px;padding:12px 24px;border-radius:var(--radius-md);font:600 16px/24px var(--font-sans);text-decoration:none;border:1.5px solid transparent;cursor:pointer;transition:background .15s}
.hb-btn:disabled{opacity:.6;cursor:wait}
.hb-btn--primary{background:var(--primary);color:#fff}
.hb-btn--primary:hover{background:var(--primary-hover)}
.hb-btn--secondary{background:transparent;border-color:var(--border-strong);color:var(--ink-900)}
.hb-btn--secondary:hover{background:var(--surface-soft)}

/* Badge */
.hb-badge{display:inline-block;padding:4px 12px;border-radius:var(--radius-full);font:500 12px/16px var(--font-sans);background:var(--surface-soft);color:var(--primary-text);align-self:flex-start}

/* Trạng thái học trên thẻ */
.status{font:600 12px/16px var(--font-sans);padding:4px 10px;border-radius:var(--radius-full);white-space:nowrap}
.status--new{background:#eef1ec;color:var(--ink-500)}
.status--review{background:var(--warning-soft);color:var(--warning-text)}
.status--done{background:var(--primary);color:#fff}

/* Eyebrow + title */
.hb-eyebrow{font:600 12px/16px var(--font-sans);letter-spacing:.08em;text-transform:uppercase;color:var(--primary-text);margin-bottom:12px}
.hb-title{font:700 32px/38px var(--font-sans);letter-spacing:-.02em;color:var(--ink-900)}
.hb-title em{font-style:normal;color:var(--primary)}
.hb-lead{font:400 18px/28px var(--font-sans);color:var(--ink-500);margin-top:16px;max-width:56ch}

/* Lời chào */
.greeting{margin-bottom:24px}
.greeting-line{font:600 18px/28px var(--font-sans);color:var(--ink-900)}
.greeting-date{font:400 15px/22px var(--font-sans);color:var(--ink-500)}
.name-form{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap}
.name-form input{padding:8px 12px;font:400 15px/20px var(--font-sans);border:1px solid var(--border-strong);border-radius:var(--radius-md);min-width:220px;color:var(--ink-900)}
.name-form .hb-btn{padding:8px 16px;font-size:14px}

/* Hero */
.hero{padding:64px 0 48px}
.hero .hb-display{font:700 56px/60px var(--font-sans);letter-spacing:-.03em;color:var(--ink-900)}
.hero .hb-display em{font-style:normal;color:var(--primary)}
.hero-actions{display:flex;gap:12px;margin-top:32px;flex-wrap:wrap}

.review-note{margin-top:16px;font-size:14px;color:var(--primary-text);font-weight:600}

/* Stat band */
.stats{background:var(--surface-inverse);color:var(--text-on-inverse);border-radius:var(--radius-lg)}
.stats-inner{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:32px 24px}
.stat-num{font:600 32px/36px var(--font-sans);letter-spacing:-.02em;color:var(--text-highlight-inverse)}
.stat-label{font:400 14px/20px var(--font-sans);margin-top:4px;opacity:.85}

/* Sections */
.section{padding:96px 0}
.section.alt{background:var(--bg-alt)}
.section-head{margin-bottom:48px}
.section-head .hb-title{font-size:32px;line-height:38px}
.search{margin-top:24px;max-width:420px}
.search input{width:100%;padding:12px 16px;font:400 15px/20px var(--font-sans);border:1px solid var(--border-strong);background:var(--surface);border-radius:var(--radius-md);color:var(--ink-900);outline:none}
.search input:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(50,133,77,.15)}
.no-results{margin-top:24px;color:var(--ink-500)}

/* Tiến độ tổng */
.progress{margin-top:24px;max-width:560px}
.progress-text{font:600 15px/22px var(--font-sans);color:var(--ink-900)}
.progress-track{margin-top:8px;height:8px;border-radius:var(--radius-full);background:var(--border);overflow:hidden}
.progress-fill{height:100%;width:0;background:var(--primary);transition:width .3s}
.login-btn{margin-top:12px}

/* Thông báo ngắn */
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--surface-inverse);color:var(--text-on-inverse);padding:12px 20px;border-radius:var(--radius-md);font-size:14px;line-height:20px;box-shadow:0 8px 24px rgba(23,48,29,.2);opacity:0;pointer-events:none;transition:opacity .2s;z-index:50}
.toast.show{opacity:1}

/* Cards */
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.hb-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:12px;transition:border-color .15s,background .15s}
.hb-card.is-done{border-color:var(--primary);background:#f6fbf7}
.card-top{display:flex;justify-content:space-between;align-items:center;gap:12px}
.hb-card-icon{width:40px;height:40px;border-radius:var(--radius-sm);background:var(--surface-soft);color:var(--green-700);display:grid;place-items:center;font-weight:700}
.hb-card.is-done .hb-card-icon{background:var(--primary);color:#fff}
.hb-card h3{font:600 22px/28px var(--font-sans);letter-spacing:-.01em;color:var(--ink-900)}
.chunk-list{list-style:none;display:flex;flex-wrap:wrap;gap:6px}
.chunk-list li{font:500 13px/18px var(--font-sans);padding:4px 10px;border-radius:var(--radius-full);background:var(--bg-alt);border:1px solid var(--border);color:var(--ink-700)}
.card-actions{margin-top:auto;display:flex;gap:8px;flex-wrap:wrap;padding-top:4px}
.card-actions .hb-btn{padding:8px 16px;font-size:14px;margin-top:0;align-self:auto}

/* Steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.step{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px}
.step-num{width:40px;height:40px;border-radius:var(--radius-full);background:var(--primary);color:#fff;display:grid;place-items:center;font-weight:700;margin-bottom:16px}
.step h3{font:600 22px/28px var(--font-sans);color:var(--ink-900);margin-bottom:8px}
.step p{font-size:14px;line-height:20px;color:var(--ink-500)}

/* Checklist */
.checklist{list-style:none;display:grid;gap:8px;margin-top:48px}
.checklist li{display:flex;gap:12px;align-items:flex-start}
.checklist li::before{content:"✓";flex:none;width:22px;height:22px;border-radius:50%;background:var(--surface-soft);color:var(--primary-text);display:grid;place-items:center;font-size:12px;font-weight:700;margin-top:1px}

/* Note */
.note{margin-top:32px;display:flex;gap:12px;align-items:flex-start;background:var(--warning-soft);color:var(--ink-700);border-radius:var(--radius-md);padding:16px 24px;font-size:14px;line-height:20px}
.note strong{color:var(--warning-text)}

/* CTA */
.cta{background:var(--surface-inverse);color:var(--text-on-inverse);border-radius:var(--radius-xl);padding:64px 48px}
.cta .hb-title{color:var(--text-on-inverse)}
.cta .hb-title em{color:var(--text-highlight-inverse)}
.cta .hb-lead{color:var(--text-on-inverse);opacity:.85}
.cta .hb-eyebrow{color:var(--text-highlight-inverse)}
.cta .hb-btn--primary{background:var(--text-highlight-inverse);color:var(--green-900)}
.cta .hb-btn--primary:hover{background:#a6d6b3}

footer{padding:48px 0;color:var(--ink-500);font-size:14px}
footer .wrap{display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px}

@media (max-width:860px){
  .grid,.steps{grid-template-columns:1fr}
  .stats-inner{grid-template-columns:1fr;gap:16px}
  .hero .hb-display{font-size:40px;line-height:44px}
  .hb-title{font-size:28px;line-height:34px}
  .section{padding:64px 0}
  .cta{padding:48px 24px}
  .nav{padding:10px 16px}
  .nav-btn{padding:6px 10px;font-size:13px}
}
</style>
</head>
<body>

<header class="topbar">
  <div class="wrap nav">
    <a class="brand" href="#">CHUNKIE</a>
    <nav class="nav-links" aria-label="Điều hướng">
      <a class="hb-btn hb-btn--secondary nav-btn" href="#bai-hoc">Bài học</a>
      <a class="hb-btn hb-btn--secondary nav-btn" href="#cach-hoc">Cách học</a>
      <a class="hb-btn hb-btn--secondary nav-btn" href="#bat-dau">Bắt đầu</a>
    </nav>
  </div>
</header>
<div class="wrap">

  <header class="hero">
    <div class="greeting">
      <p class="greeting-line" id="greetingLine" hidden></p>
      <p class="greeting-date" id="greetingDate"></p>
      <form class="name-form" id="nameForm" hidden>
        <input type="text" id="nameInput" maxlength="40" aria-label="Tên của bạn" placeholder="Tên của bạn">
        <button class="hb-btn hb-btn--secondary" type="submit">Lưu tên</button>
      </form>
    </div>
    <p class="hb-eyebrow">Thư viện chunk từ podcast</p>
    <h1 class="hb-display">Học <em>chunk</em> để nói tiếng Anh tự nhiên hơn</h1>
    <p class="hb-lead">Mỗi bài tóm tắt 8–10 cụm từ hay dùng nhất trong 6 Minute English, kèm ví dụ đời sống, ghi chú phát âm và câu hỏi luyện Speaking IELTS.</p>
    <div class="hero-actions">
      <a class="hb-btn hb-btn--primary" href="#bai-hoc">Xem bài học →</a>
      <a class="hb-btn hb-btn--secondary" href="#cach-hoc">Cách học</a>
      <a class="hb-btn hb-btn--secondary" href="chunks.html">Xem lại chunks đã học</a>
    </div>
    <p class="review-note" id="reviewNote"></p>
  </header>

  <section class="stats" aria-label="Số liệu">
    <div class="stats-inner">
      <div><div class="stat-num" id="total-count">${count}</div><div class="stat-label">Bài học đã có</div></div>
      <div><div class="stat-num">8–10</div><div class="stat-label">Chunk mỗi bài</div></div>
      <div><div class="stat-num">10</div><div class="stat-label">Câu Speaking mỗi bài</div></div>
    </div>
  </section>
</div>

<section class="section" id="bai-hoc">
  <div class="wrap">
    <div class="section-head">
      <p class="hb-eyebrow">Thư viện</p>
      <h2 class="hb-title">Chọn một bài để <em>bắt đầu</em></h2>
      <div class="search">
        <input type="text" id="searchInput" aria-label="Tìm bài học" placeholder="Tìm bài theo tiêu đề, chủ đề hoặc chunk...">
      </div>
      <div class="progress" aria-live="polite">
        <p class="progress-text" id="progressText">Đang tải tiến độ…</p>
        <div class="progress-track" aria-hidden="true"><div class="progress-fill" id="progressFill"></div></div>
        <button class="hb-btn hb-btn--primary login-btn" id="loginBtn" type="button" hidden>Đăng nhập để lưu tiến độ</button>
      </div>
    </div>

    <div class="grid" id="lessonsGrid">

${cardsHtml}
    </div>
    <p class="no-results" id="noResults" hidden>Không tìm thấy bài nào. Thử từ khóa khác nhé.</p>
  </div>
</section>

<section class="section alt" id="cach-hoc">
  <div class="wrap">
    <div class="section-head">
      <p class="hb-eyebrow">Cách học</p>
      <h2 class="hb-title">Ba bước cho <em>mỗi bài</em></h2>
    </div>

    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <h3>Đọc chunk</h3>
        <p>Xem nghĩa tiếng Việt, nghĩa tiếng Anh và câu ví dụ trong bài.</p>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <h3>Lật flashcard</h3>
        <p>Tự nhớ nghĩa trước, rồi lật thẻ để kiểm tra lại.</p>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <h3>Nói Speaking</h3>
        <p>Trả lời câu hỏi IELTS bằng chunk vừa học, rồi so với sample answer.</p>
      </div>
    </div>

    <ul class="checklist">
      <li>Mỗi chunk có ví dụ trong bài và một ví dụ đời sống hằng ngày</li>
      <li>Ghi chú phát âm cho chỗ nối âm và nuốt âm</li>
      <li>Tiến độ được lưu theo tài khoản Gmail của bạn</li>
    </ul>

    <div class="note">
      <span aria-hidden="true">⚠</span>
      <div><strong>Lưu ý nội dung:</strong> trang này chỉ hiển thị phần giải thích chunk do mình viết. Bài gốc từ BBC Learning English vẫn thuộc bản quyền của BBC.</div>
    </div>
  </div>
</section>

<section class="section" id="bat-dau">
  <div class="wrap">
    <div class="cta">
      <p class="hb-eyebrow">Bắt đầu</p>
      <h2 class="hb-title">Học xong <em>bài 1</em> trong 15 phút</h2>
      <p class="hb-lead">Chọn bài đầu tiên, đọc 3 chunk đầu và thử đặt một câu với mỗi chunk.</p>
      <div class="hero-actions">
        <a class="hb-btn hb-btn--primary" href="Making-'mum-friends'.html">Mở bài 1</a>
      </div>
    </div>
  </div>
</section>

<footer>
  <div class="wrap">
    <span>© CHUNKIE</span>
    <span>Nội dung bài gốc thuộc BBC Learning English</span>
  </div>
</footer>

<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script>
const searchInput = document.getElementById("searchInput");
const cards = document.querySelectorAll(".lesson-card");
const doneButtons = document.querySelectorAll(".done-btn");
const noResults = document.getElementById("noResults");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const loginBtn = document.getElementById("loginBtn");
const toastEl = document.getElementById("toast");

// Chunk đã lưu trên máy (chunk-list.js ghi vào localStorage)
function savedChunks() {
  try { return Object.values(JSON.parse(localStorage.getItem("6me-chunks-v1")) || {}); }
  catch (e) { return []; }
}

// Đếm chunk đang muốn ôn
const due = savedChunks().filter(x => x.status === "review").length;
if (due > 0) document.getElementById("reviewNote").textContent = "Bạn đang có " + due + " chunk cần ôn.";

// Bài có chunk đang ôn không (mỗi chunk lưu kèm tên file bài)
function safeDecode(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }
function lessonHasReview(id) {
  const file = id + ".html";
  return savedChunks().some(x => x.status === "review" && safeDecode(x.file || "") === file);
}

// Thông báo ngắn
let toastTimer;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3500);
}

// Tìm kiếm theo tiêu đề, chủ đề và chunk
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase().trim();
  let shown = 0;
  cards.forEach(card => {
    const match = card.textContent.toLowerCase().includes(query);
    card.style.display = match ? "flex" : "none";
    if (match) shown++;
  });
  noResults.hidden = shown > 0;
});

// Vẽ lại một thẻ theo trạng thái: Đã học > Đang ôn > Chưa học
function renderCard(btn, done) {
  const card = btn.closest(".lesson-card");
  const badge = card.querySelector(".status");
  const state = done ? "done" : lessonHasReview(btn.dataset.id) ? "review" : "new";
  const labels = { new: "Chưa học", review: "Đang ôn", done: "✓ Đã học" };
  badge.className = "status status--" + state;
  badge.textContent = labels[state];
  card.classList.toggle("is-done", done);
  btn.setAttribute("aria-pressed", done ? "true" : "false");
  btn.textContent = done ? "✓ Đã học" : "Đánh dấu đã học";
}

// Dòng tổng kết: Đã học X/Y bài
function updateSummary() {
  const total = doneButtons.length;
  const done = [...doneButtons].filter(b => b.getAttribute("aria-pressed") === "true").length;
  progressText.textContent = "Đã học " + done + "/" + total + " bài";
  progressFill.style.width = (total ? (done / total) * 100 : 0) + "%";
}

// Tiến độ theo tài khoản: lưu trên server qua /api/progress
// Trả về dữ liệu, "login" (chưa đăng nhập) hoặc "error" (lỗi mạng/server)
async function loadProgress() {
  try {
    const res = await fetch("/api/progress");
    if (res.status === 401) return "login";
    if (!res.ok) return "error";
    return await res.json();
  } catch (e) { return "error"; }
}
// Trả về "ok", "login" hoặc "error"
async function saveProgress(lessonId, completed) {
  try {
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, completed })
    });
    if (res.ok) return "ok";
    return res.status === 401 ? "login" : "error";
  } catch (e) { return "error"; }
}

loginBtn.addEventListener("click", () => location.reload());

doneButtons.forEach(btn => {
  btn.addEventListener("click", async () => {
    const done = btn.getAttribute("aria-pressed") !== "true";
    btn.disabled = true;
    renderCard(btn, done);
    updateSummary();

    const status = await saveProgress(btn.dataset.id, done);
    btn.disabled = false;

    if (status !== "ok") {
      // Lưu thất bại: trả thẻ về trạng thái cũ và báo cho người học
      renderCard(btn, !done);
      updateSummary();
      if (status === "login") {
        showToast("Chưa lưu được vì bạn chưa đăng nhập.");
        loginBtn.hidden = false;
      } else {
        showToast("Chưa lưu được, thử lại nhé.");
      }
    }
  });
});

// Lời chào: tên lấy từ /api/me, ngày lấy từ trình duyệt
const greetingLine = document.getElementById("greetingLine");
const greetingDate = document.getElementById("greetingDate");
const nameForm = document.getElementById("nameForm");
const nameInput = document.getElementById("nameInput");

function renderGreetingDate() {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
  });
  greetingDate.textContent = "Hôm nay là " + today + ".";
}

function renderGreetingLine(name) {
  const who = name ? "Chào " + name + "!" : "Chào bạn!";
  greetingLine.textContent = who + " Chúc bạn một ngày học thật vui và hiệu quả.";
  greetingLine.hidden = false;
}

async function loadMe() {
  try {
    const res = await fetch("/api/me");
    return res.ok ? await res.json() : null;
  } catch (e) { return null; }
}

nameForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;
  let ok = false;
  try {
    const res = await fetch("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    ok = res.ok;
  } catch (err) { ok = false; }
  if (ok) {
    nameForm.hidden = true;
    renderGreetingLine(name);
    showToast("Đã lưu tên của bạn.");
  } else {
    showToast("Chưa lưu được tên, thử lại nhé.");
  }
});

(async function init() {
  // Hiện ngay trạng thái theo chunk trên máy, rồi cập nhật theo tài khoản
  doneButtons.forEach(btn => renderCard(btn, false));
  updateSummary();

  renderGreetingDate();
  const me = await loadMe();
  if (me) {
    renderGreetingLine(me.name);
    nameForm.hidden = !!me.name;
  }

  const progress = await loadProgress();
  if (progress === "login") {
    progressText.textContent = "Chưa đăng nhập nên tiến độ chưa được lưu";
    loginBtn.hidden = false;
  } else if (progress === "error") {
    progressText.textContent = "Chưa tải được tiến độ";
    showToast("Chưa tải được tiến độ, thử tải lại trang nhé.");
  } else {
    doneButtons.forEach(btn => renderCard(btn, progress[btn.dataset.id] === true));
    updateSummary();
  }
})();
<\/script>
</body>
</html>
`;

  fs.writeFileSync("index.html", template);
}

main();
