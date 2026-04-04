/* =========================  
STATE  
========================= */  
let skuIndex = {}  
let articleIndex = {}  
let cache = {}  
let isReady = false  

const MAX_RESULT = 30  
const TOTAL_FILE = 100  

const DEBUG = true

/* =========================  
ELEMENT  
========================= */  
const searchInput = document.getElementById("search")  
const resultEl = document.getElementById("result")  
const statusEl = document.getElementById("status")  

const btnCamera = document.getElementById("btnCamera")
const btnCapture = document.getElementById("btnCapture")
const btnClose = document.getElementById("btnClose")

const video = document.getElementById("camera")

/* =========================  
OCR (ULTRA FAST)
========================= */
let worker = null
let isOCRReady = false

async function initOCR() {
  const t0 = performance.now()

  worker = await Tesseract.createWorker()

  await worker.loadLanguage("eng")
  await worker.initialize("eng")

  await worker.setParameters({
    tessedit_char_whitelist: "0123456789",
    tessedit_pageseg_mode: 7
  })

  isOCRReady = true

  DEBUG && console.log("OCR READY:", (performance.now() - t0).toFixed(0), "ms")
}

initOCR()

/* =========================  
FREEZE STATE
========================= */
let stream = null
let isFrozen = false
let isSelecting = false

const freezeCanvas = document.createElement("canvas")
const freezeCtx = freezeCanvas.getContext("2d")

/* =========================  
GESTURE STATE
========================= */
let startX = 0
let startY = 0
let endX = 0
let endY = 0

/* =========================  
OVERLAY
========================= */
const overlay = document.createElement("canvas")
const overlayCtx = overlay.getContext("2d")

overlay.style.position = "fixed"
overlay.style.inset = "0"
overlay.style.zIndex = "1002"
overlay.style.pointerEvents = "none"

document.body.appendChild(overlay)

/* =========================  
START CAMERA
========================= */
btnCamera.addEventListener("click", async () => {
  if (stream) return

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    })

    video.srcObject = stream
    video.play()

    overlay.width = window.innerWidth
    overlay.height = window.innerHeight

    statusEl.innerText = "Klik ambil gambar"

  } catch (err) {
    console.error(err)
    alert("Kamera gagal: " + err.message)
  }
})

/* =========================  
CAPTURE (FREEZE)
========================= */
btnCapture.addEventListener("click", () => {
  if (!stream) return

  const t0 = performance.now()

  freezeCanvas.width = video.videoWidth
  freezeCanvas.height = video.videoHeight

  freezeCtx.drawImage(video, 0, 0)

  isFrozen = true

  video.style.display = "none"

  freezeCanvas.style.position = "fixed"
  freezeCanvas.style.inset = "0"
  freezeCanvas.style.zIndex = "1001"

  document.body.appendChild(freezeCanvas)

  DEBUG && console.log("CAPTURE TIME:", (performance.now() - t0).toFixed(0), "ms")

  statusEl.innerText = "Seleksi SKU"
})

/* =========================  
GESTURE SELECT
========================= */
freezeCanvas.addEventListener("touchstart", (e) => {
  if (!isFrozen) return

  isSelecting = true
  const t = e.touches[0]

  startX = t.clientX
  startY = t.clientY
})

freezeCanvas.addEventListener("touchmove", (e) => {
  if (!isSelecting) return

  const t = e.touches[0]
  endX = t.clientX
  endY = t.clientY

  overlayCtx.clearRect(0, 0, overlay.width, overlay.height)

  overlayCtx.strokeStyle = "#00ffcc"
  overlayCtx.lineWidth = 2

  overlayCtx.strokeRect(startX, startY, endX - startX, endY - startY)
})

freezeCanvas.addEventListener("touchend", async () => {
  if (!isSelecting) return
  isSelecting = false

  const tStart = performance.now()

  overlayCtx.clearRect(0, 0, overlay.width, overlay.height)

  if (!isOCRReady) {
    statusEl.innerText = "OCR belum siap..."
    return
  }

  const scaleX = freezeCanvas.width / overlay.width
  const scaleY = freezeCanvas.height / overlay.height

  const x = Math.min(startX, endX) * scaleX
  const y = Math.min(startY, endY) * scaleY
  const w = Math.abs(endX - startX) * scaleX
  const h = Math.abs(endY - startY) * scaleY

  if (w < 80 || h < 30) {
    statusEl.innerText = "Area terlalu kecil"
    return
  }

  /* =========================  
  RESIZE (ULTRA SPEED)
  ========================= */
  const MAX_WIDTH = 600
  const ratio = Math.min(1, MAX_WIDTH / w)

  const tempCanvas = document.createElement("canvas")
  tempCanvas.width = w * ratio
  tempCanvas.height = h * ratio

  const tempCtx = tempCanvas.getContext("2d")

  tempCtx.filter = "grayscale(1) contrast(2)"
  tempCtx.drawImage(
    freezeCanvas,
    x, y, w, h,
    0, 0,
    tempCanvas.width,
    tempCanvas.height
  )

  DEBUG && console.log("CROP SIZE:", w, h, "=>", tempCanvas.width, tempCanvas.height)

  statusEl.innerText = "Scanning..."

  const tOCR = performance.now()

  const result = await worker.recognize(tempCanvas)

  let text = result.data.text || ""

  DEBUG && console.log("OCR RAW:", text)

  text = text.replace(/[^0-9]/g, " ").trim()

  DEBUG && console.log("OCR CLEAN:", text)

  let keyword = text
    .split(" ")
    .sort((a, b) => b.length - a.length)[0]

  DEBUG && console.log("FINAL SKU:", keyword)

  if (!keyword) {
    statusEl.innerText = "SKU tidak terbaca"
    return
  }

  searchInput.value = keyword
  searchInput.dispatchEvent(new Event("input"))

  const tEnd = performance.now()

  DEBUG && console.log("OCR TIME:", (tEnd - tOCR).toFixed(0), "ms")
  DEBUG && console.log("TOTAL TIME:", (tEnd - tStart).toFixed(0), "ms")

  statusEl.innerText = "Scan selesai"
})

/* =========================  
STOP CAMERA
========================= */
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }

  isFrozen = false
  isSelecting = false

  if (freezeCanvas.parentNode) {
    freezeCanvas.parentNode.removeChild(freezeCanvas)
  }

  video.style.display = "block"

  overlayCtx.clearRect(0, 0, overlay.width, overlay.height)

  statusEl.innerText = "Kamera ditutup"
}

btnClose?.addEventListener("click", stopCamera)

/* =========================  
STOP CAMERA
========================= */
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }

  isFrozen = false
  isSelecting = false

  if (freezeCanvas.parentNode) {
    freezeCanvas.parentNode.removeChild(freezeCanvas)
  }

  video.style.display = "block"

  video.classList.remove("active")
  document.body.classList.remove("camera-open")

  scanFrame?.classList.remove("active")
  scanText?.classList.remove("active")
  btnClose?.classList.remove("active")

  overlayCtx.clearRect(0, 0, overlay.width, overlay.height)
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
      <div><b>Sumber:</b> ${getFileName(item.source)}</div>  
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