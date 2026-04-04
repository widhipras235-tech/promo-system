/* =========================  
STATE  
========================= */  
let skuIndex = {}  
let articleIndex = {}  
let cache = {}  
let isReady = false  

const MAX_RESULT = 30  
const TOTAL_FILE = 100  

/* =========================  
ELEMENT  
========================= */  
const searchInput = document.getElementById("search")  
const resultEl = document.getElementById("result")  
const statusEl = document.getElementById("status")  
const btnCamera = document.getElementById("btnCamera")

const video = document.getElementById("camera")
const canvas = document.getElementById("canvas")
const ctx = canvas.getContext("2d")

const scanFrame = document.getElementById("scanFrame")
const scanText = document.getElementById("scanText")
const btnClose = document.getElementById("btnClose")

let stream = null
let capturedImage = null
let ocrData = null

/* =========================  
LENS LAYER  
========================= */
let lensLayer = document.createElement("div")
lensLayer.id = "lensLayer"
document.body.appendChild(lensLayer)

/* =========================  
START CAMERA  
========================= */
btnCamera.addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    })

    video.srcObject = stream
    video.play()

    video.classList.add("active")
    document.body.classList.add("camera-open")

    statusEl.innerText = "Tap untuk ambil gambar"

  } catch (err) {
    alert("Kamera gagal: " + err.message)
  }
})

/* =========================  
CAPTURE IMAGE  
========================= */
video.addEventListener("click", async () => {
  if (!stream) return

  const scale = 0.5

  canvas.width = video.videoWidth * scale
  canvas.height = video.videoHeight * scale

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  capturedImage = canvas.toDataURL()

  stopStreamOnly()

  statusEl.innerText = "Menganalisa gambar..."

  setTimeout(async () => {
    const result = await Tesseract.recognize(canvas, "eng")
    ocrData = result.data

    drawBoxes()

    statusEl.innerText = "Tap teks untuk memilih"
  }, 100)
})

function stopStreamOnly() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
}

/* =========================  
DRAW OCR BOXES  
========================= */
function drawBoxes() {
  lensLayer.innerHTML = ""

  const scaleX = window.innerWidth / canvas.width
  const scaleY = window.innerHeight / canvas.height

  ocrData.words.slice(0, 80).forEach(word => {

    if (!/[0-9A-Za-z]/.test(word.text)) return
    if (word.text.length < 2) return

    const b = word.bbox

    const div = document.createElement("div")
    div.className = "lens-box"

    div.style.left = b.x0 * scaleX + "px"
    div.style.top = b.y0 * scaleY + "px"
    div.style.width = (b.x1 - b.x0) * scaleX + "px"
    div.style.height = (b.y1 - b.y0) * scaleY + "px"

    div.onclick = () => {
      selectText(word.text)
    }

    lensLayer.appendChild(div)
  })
}

/* =========================  
SELECT TEXT  
========================= */
function selectText(text) {
  text = text.replace(/[^0-9]/g, " ").trim()

  let keyword = text
    .split(" ")
    .sort((a, b) => b.length - a.length)[0]

  if (!keyword) {
    statusEl.innerText = "Teks tidak valid"
    return
  }

  searchInput.value = keyword
  searchInput.dispatchEvent(new Event("input"))

  statusEl.innerText = "Dipilih: " + keyword
}

/* =========================  
GESTURE SELECT AREA  
========================= */
let isDrawing = false
let startX = 0
let startY = 0
let endX = 0
let endY = 0

video.addEventListener("touchstart", (e) => {
  if (!ocrData) return

  isDrawing = true
  const t = e.touches[0]
  startX = t.clientX
  startY = t.clientY
})

video.addEventListener("touchmove", (e) => {
  if (!isDrawing) return

  const t = e.touches[0]
  endX = t.clientX
  endY = t.clientY
})

video.addEventListener("touchend", () => {
  if (!isDrawing) return
  isDrawing = false

  if (!ocrData) return

  const scaleX = canvas.width / window.innerWidth
  const scaleY = canvas.height / window.innerHeight

  const x1 = Math.min(startX, endX) * scaleX
  const y1 = Math.min(startY, endY) * scaleY
  const x2 = Math.max(startX, endX) * scaleX
  const y2 = Math.max(startY, endY) * scaleY

  let selectedText = ""

  ocrData.words.forEach(word => {
    const b = word.bbox

    if (
      b.x1 > x1 &&
      b.x0 < x2 &&
      b.y1 > y1 &&
      b.y0 < y2
    ) {
      selectedText += " " + word.text
    }
  })

  selectText(selectedText)
})

/* =========================  
STOP CAMERA  
========================= */
function stopCamera() {
  stopStreamOnly()

  video.classList.remove("active")
  document.body.classList.remove("camera-open")

  lensLayer.innerHTML = ""
  ocrData = null
}

btnClose?.addEventListener("click", stopCamera)

/* =========================  
STATUS PROMO  
========================= */  
function getStatusPromo(mulai, akhir) {
  const now = new Date()

  const start = new Date(
    !isNaN(mulai)
      ? (Number(mulai) - 25569) * 86400 * 1000
      : mulai
  )

  const end = new Date(
    !isNaN(akhir)
      ? (Number(akhir) - 25569) * 86400 * 1000
      : akhir
  )

  if (isNaN(start) || isNaN(end)) return "Tidak diketahui"

  if (now < start) return "Belum aktif"
  if (now > end) return "Berakhir"
  return "Aktif"
}

function getStatusPriority(status) {
  switch (status) {
    case "Aktif": return 1
    case "Belum aktif": return 2
    case "Berakhir": return 3
    default: return 99
  }
}

function getStatusColor(status) {
  switch (status) {
    case "Aktif": return "green"
    case "Belum aktif": return "orange"
    case "Berakhir": return "red"
    default: return "gray"
  }
}

/* =========================  
PRIORITY + HIGHLIGHT  
========================= */  
function getPriority(item, keyword) {  
  const sku = normalize(item.sku)  
  const article = normalize(item.article)  
  const desc = normalize(item.deskripsi)  

  if (sku === keyword) return 1  
  if (article === keyword) return 2  
  if (sku.startsWith(keyword)) return 3  
  if (article.startsWith(keyword)) return 4  
  if (sku.includes(keyword)) return 5  
  if (article.includes(keyword)) return 6  
  if (desc.includes(keyword)) return 10  

  return 999  
}  

function highlight(text, keyword) {  
  if (!text) return "-"  
  const safe = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")  
  const regex = new RegExp(`(${safe})`, "gi")  
  return text.toString().replace(regex, `<mark>$1</mark>`)  
}  

/* =========================  
LOAD INDEX  
========================= */  
async function loadIndex() {  
  try {  
    statusEl.innerText = "Loading index..."  

    const [skuRes, articleRes] = await Promise.all([  
      fetch("./db/sku_index.json"),  
      fetch("./db/article_index.json")  
    ])  

    if (skuRes.ok) skuIndex = await skuRes.json()  
    if (articleRes.ok) articleIndex = await articleRes.json()  

    isReady = true  
    statusEl.innerText = "Siap digunakan"  
  } catch (err) {  
    console.log("❌ Index gagal:", err)  
    isReady = true  
    statusEl.innerText = "Mode fallback aktif"  
  }  
}  
loadIndex()  

/* =========================  
UTILS  
========================= */  
function formatRupiah(num) {  
  if (!num || isNaN(num)) return num  
  return "Rp " + Number(num).toLocaleString("id-ID")  
}  

function formatDiskon(val) {  
  if (!val) return "-"  
  if (!isNaN(val)) {  
    let num = Number(val)  
    return num <= 1 ? Math.round(num * 100) + "%" : num + "%"  
  }  
  return val  
}  

function getFileName(path) {  
  return path ? path.split(/[\\/]/).pop() : "-"  
}  

function formatTanggal(val) {  
  if (!val || val === 0 || val === "0") return "-"  

  if (!isNaN(val)) {  
    const excelDate = Number(val)  
    if (excelDate < 1000) return "-"  
    const date = new Date((excelDate - 25569) * 86400 * 1000)  
    return date.toLocaleDateString("id-ID", {  
      day: "2-digit",  
      month: "short",  
      year: "numeric"  
    })  
  }  

  const d = new Date(val)  
  if (isNaN(d)) return "-"  

  return d.toLocaleDateString("id-ID", {  
    day: "2-digit",  
    month: "short",  
    year: "numeric"  
  })  
}  

/* =========================  
LOAD FILE (CACHE)  
========================= */  
async function loadFile(fileIndex) {  
  try {  
    if (cache[fileIndex]) return cache[fileIndex]  

    const res = await fetch(`./db/promo_${fileIndex}.json`)  
    if (!res.ok) return []  

    const data = await res.json()  
    cache[fileIndex] = data  

    return data  
  } catch {  
    return []  
  }  
}  

/* =========================  
SORT FINAL  
========================= */  
function finalSort(results, keyword) {
  return results.sort((a, b) => {
    // Status dulu
    if (a._statusPriority !== b._statusPriority) {
      return a._statusPriority - b._statusPriority
    }
    // Baru relevansi search
    return a._priority - b._priority
  })
}

/* =========================  
EXACT RESULT  
========================= */  
async function getExactResults(indexList, keyword) {  
  let results = []  
  keyword = normalize(keyword)  

  for (let i of indexList) {  
    const fileIndex = Math.floor(i / 5000) + 1  
    const data = await loadFile(fileIndex)  

    const item = data[i % 5000]  
    if (!item) continue  

    const sku = normalize(item.sku)  
    const article = normalize(item.article)  

    if (sku === keyword || article === keyword) {  
      const mulai = item.fromdate || item.raw?.fromdate  
      const akhir = item.todate || item.raw?.todate  
      const status = getStatusPromo(mulai, akhir)

      results.push({  
        ...item,  
        _priority: getPriority(item, keyword),
        _status: status,
        _statusPriority: getStatusPriority(status)
      })  
    }  

    if (results.length >= MAX_RESULT) break  
  }  

  return finalSort(results, keyword)
}  

/* =========================  
RESULT DARI INDEX  
========================= */  
async function getResultsFromIndexes(indexes, keyword) {  
  let results = []  
  keyword = normalize(keyword)  

  let fileMap = {}  

  indexes.forEach(i => {  
    const fileIndex = Math.floor(i / 5000) + 1  
    if (!fileMap[fileIndex]) fileMap[fileIndex] = []  
    fileMap[fileIndex].push(i)  
  })  

  for (let fileIndex in fileMap) {  
    const data = await loadFile(fileIndex)  

    for (let i of fileMap[fileIndex]) {  
      const item = data[i % 5000]  
      if (!item) continue  

      const mulai = item.fromdate || item.raw?.fromdate  
      const akhir = item.todate || item.raw?.todate  
      const status = getStatusPromo(mulai, akhir)

      results.push({  
        ...item,  
        _priority: getPriority(item, keyword),
        _status: status,
        _statusPriority: getStatusPriority(status)
      })  

      if (results.length >= MAX_RESULT) break  
    }  
  }  

  return finalSort(results, keyword).slice(0, MAX_RESULT)
}  

/* =========================  
FULL SCAN  
========================= */  
async function fullScanSearch(keyword) {  
  let results = []  
  keyword = normalize(keyword)  

  for (let i = 1; i <= TOTAL_FILE; i++) {  
    const data = await loadFile(i)  

    for (let item of data) {  
      const mulai = item.fromdate || item.raw?.fromdate  
      const akhir = item.todate || item.raw?.todate  
      const status = getStatusPromo(mulai, akhir)

      results.push({  
        ...item,  
        _priority: getPriority(item, keyword),
        _status: status,
        _statusPriority: getStatusPriority(status)
      })  

      if (results.length >= MAX_RESULT) break  
    }  
  }  

  return finalSort(results, keyword).slice(0, MAX_RESULT)
}  

/* =========================  
SEARCH ENGINE  
========================= */  
async function searchData(keyword) {  
  keyword = normalize(keyword)  
  if (!keyword) return []  

  if (skuIndex[keyword]) return await getExactResults(skuIndex[keyword], keyword)  
  if (articleIndex[keyword]) return await getExactResults(articleIndex[keyword], keyword)  

  let indexes = new Set()  
  let prefix = keyword.slice(0, 3)  

  for (let key in skuIndex) {  
    if (!key.startsWith(prefix)) continue  

    if (key.startsWith(keyword)) {  
      skuIndex[key].forEach(i => {  
        if (indexes.size < MAX_RESULT) indexes.add(i)  
      })  
    }  

    if (indexes.size >= MAX_RESULT) break  
  }  

  if (indexes.size > 0) {
    return await getResultsFromIndexes(indexes, keyword)
  }

  return await fullScanSearch(keyword)
}

/* =========================  
RENDER  
========================= */  
function render(data) {  
  resultEl.innerHTML = ""  

  if (!data || data.length === 0) {  
    resultEl.innerHTML = "<p>Data tidak ditemukan</p>"  
    return  
  }  

  data.forEach(item => {  
    const diskon = formatDiskon(item.diskon || item.raw?.diskon)  

    const mulai = item.fromdate || item.raw?.fromdate || "-"  
    const akhir = item.todate || item.raw?.todate || "-"  

    const status = item._status || "Tidak diketahui"
    const statusColor = getStatusColor(status)

    const el = document.createElement("div")  
    el.className = "card"  

    el.innerHTML = `  
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div><b>${highlight(item.deskripsi, searchInput.value)}</b></div>
        <div style="
          background:${statusColor};
          color:white;
          padding:4px 8px;
          border-radius:6px;
          font-size:12px;
          font-weight:bold;
        ">
          ${status}
        </div>
      </div>

      <div>Brand: ${item.brand || "-"}</div>  
      <div>SKU: ${highlight(item.sku, searchInput.value)}</div>  
      <div>Article: ${highlight(item.article, searchInput.value)}</div>  

      <div>Harga Normal: ${formatRupiah(item.harga_normal)}</div>  

      <div style="color:red;font-weight:bold">  
        Harga Promo: ${  
          !isNaN(item.harga_promo)  
            ? formatRupiah(item.harga_promo)  
            : item.harga_promo || "-"  
        }  
      </div>  

      <div style="color:green;font-weight:bold">  
        Diskon: ${diskon}  
      </div>  

      <div>  
        Berlaku: ${formatTanggal(mulai)} - ${formatTanggal(akhir)}  
      </div>  

      <div><b>Acara:</b> ${item.acara || item.raw?.acara || "-"}</div>  
      <div><b>📑Sumber:</b> ${getFileName(item.source)}</div>  
    `  

    resultEl.appendChild(el)  
  })  
}  

/* =========================  
EVENT  
========================= */  
let timer  

searchInput.addEventListener("input", e => {  
  clearTimeout(timer)  

  const keyword = e.target.value  

  if (!isReady) {  
    statusEl.innerText = "Loading..."  
    return  
  }  

  timer = setTimeout(async () => {  
    if (!keyword.trim()) {  
      resultEl.innerHTML = ""  
      statusEl.innerText = "Ketik untuk mencari"  
      return  
    }  

    statusEl.innerText = "Mencari..."  

    const result = await searchData(keyword)  

    render(result)  

    statusEl.innerText = `Ditemukan ${result.length} data`  
  }, 200)  
})  

/* =========================  
AUTO UPDATE  
========================= */  
let lastUpdate = null  

setInterval(async () => {  
  try {  
    const res = await fetch("./db/sku_index.json?t=" + Date.now())  
    const res2 = await fetch("./db/article_index.json?t=" + Date.now())  

    const text = await res.text()  
    const text2 = await res2.text()  

    if (lastUpdate && lastUpdate !== (text + text2)) {  
      console.log("🔄 Data berubah, reload...")  
      location.reload()  
    }  

    lastUpdate = text + text2  
  } catch (err) {  
    console.log("❌ Gagal cek update")  
  }  
}, 300000)