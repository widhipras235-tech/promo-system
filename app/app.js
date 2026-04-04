/* =========================
DEBUG SYSTEM
========================= */
const DEBUG = true

function log(...args) {
  if (DEBUG) console.log("🟢", ...args)
}
function warn(...args) {
  if (DEBUG) console.warn("🟡", ...args)
}
function errorLog(...args) {
  if (DEBUG) console.error("🔴", ...args)
}
function time(label) {
  if (DEBUG) console.time(label)
}
function timeEnd(label) {
  if (DEBUG) console.timeEnd(label)
}

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

/* =========================  
INIT  
========================= */  
function normalize(val) {  
  return (val || "").toString().toLowerCase().trim()  
}  

let stream = null

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

window.addEventListener("resize", () => {
  overlay.width = window.innerWidth
  overlay.height = window.innerHeight
})

/* =========================  
CAMERA
========================= */
btnCamera.addEventListener("click", async () => {
  if (stream) return

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    })

    video.srcObject = stream
    video.onloadedmetadata = () => video.play()

    overlay.width = window.innerWidth
    overlay.height = window.innerHeight

    video.classList.add("active")
    document.body.classList.add("camera-open")

    scanFrame?.classList.add("active")
    scanText?.classList.add("active")
    btnClose?.classList.add("active")

    statusEl.innerText = "Usap area SKU untuk scan"

  } catch (err) {
    if (err.name === "NotAllowedError") {
      alert("Izin kamera ditolak")
    } else {
      alert("Kamera gagal: " + err.message)
    }
  }
})

/* =========================  
GESTURE
========================= */
let isDrawing = false
let startX = 0, startY = 0, endX = 0, endY = 0

video.addEventListener("touchstart", (e) => {
  if (!stream) return
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

  overlayCtx.clearRect(0, 0, overlay.width, overlay.height)
  overlayCtx.strokeStyle = "#00ffcc"
  overlayCtx.lineWidth = 2
  overlayCtx.strokeRect(startX, startY, endX - startX, endY - startY)
})

video.addEventListener("touchend", () => {
  if (!isDrawing) return
  isDrawing = false

  overlayCtx.clearRect(0, 0, overlay.width, overlay.height)

  const scaleX = video.videoWidth / overlay.width
  const scaleY = video.videoHeight / overlay.height

  const x = Math.min(startX, endX) * scaleX
  const y = Math.min(startY, endY) * scaleY
  const w = Math.abs(endX - startX) * scaleX
  const h = Math.abs(endY - startY) * scaleY

  if (w < 50 || h < 20) {
    statusEl.innerText = "Area terlalu kecil"
    return
  }

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  ctx.filter = "grayscale(1) contrast(3) brightness(1.2)"
  ctx.drawImage(video, 0, 0)
  ctx.filter = "none"

  const temp = document.createElement("canvas")
  temp.width = w
  temp.height = h
  temp.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h)

  statusEl.innerText = "Membaca..."

  setTimeout(async () => {
    time("OCR PROCESS")

    const result = await Tesseract.recognize(temp, "eng")

    log("OCR RAW:", result.data.text)

    let text = (result.data.text || "").replace(/[^0-9]/g, " ")

    let keyword = text
      .split(" ")
      .filter(x => x.length >= 5)
      .sort((a, b) => b.length - a.length)[0]

    log("OCR CLEAN:", keyword)

    if (!keyword) {
      warn("OCR gagal baca")
      statusEl.innerText = "SKU tidak terbaca"
      return
    }

    searchInput.value = keyword
    searchInput.dispatchEvent(new Event("input"))

    timeEnd("OCR PROCESS")

    stopCamera()
  }, 10)
})

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }

  video.classList.remove("active")
  document.body.classList.remove("camera-open")
  scanFrame?.classList.remove("active")
  scanText?.classList.remove("active")
  btnClose?.classList.remove("active")
}

btnClose?.addEventListener("click", stopCamera)

/* =========================
HIGHLIGHT (FIXED)
========================= */
function highlight(text, keyword) {
  if (!text) return "-"
  const safe = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`(${safe})`, "gi")
  return text.toString().replace(regex, "<mark>$1</mark>")
}

/* =========================
LOAD INDEX
========================= */
async function loadIndex() {
  try {
    time("LOAD INDEX")

    const [a, b] = await Promise.all([
      fetch("./db/sku_index.json"),
      fetch("./db/article_index.json")
    ])

    skuIndex = await a.json()
    articleIndex = await b.json()

    log("Index loaded:", {
      sku: Object.keys(skuIndex).length,
      article: Object.keys(articleIndex).length
    })

    isReady = true
    statusEl.innerText = "Siap"

    timeEnd("LOAD INDEX")

  } catch (err) {
    errorLog("Index gagal:", err)
    isReady = true
  }
}
loadIndex()

/* =========================
LOAD FILE (CACHE + DEBUG)
========================= */
async function loadFile(i) {
  if (cache[i]) {
    log("CACHE HIT:", i)
    return cache[i]
  }

  time("FETCH FILE " + i)

  try {
    const res = await fetch(`./db/promo_${i}.json`)
    if (!res.ok) {
      warn("File gagal:", i)
      return []
    }

    const data = await res.json()
    cache[i] = data

    log("FETCH OK:", i, "items:", data.length)

    if (Object.keys(cache).length > 10) {
      warn("Cache reset")
      cache = {}
    }

    return data

  } catch (err) {
    errorLog("Fetch error:", i, err)
    return []
  } finally {
    timeEnd("FETCH FILE " + i)
  }
}

/* =========================
SEARCH ENGINE
========================= */
async function searchData(keyword) {
  time("SEARCH TOTAL")

  keyword = normalize(keyword)
  log("SEARCH:", keyword)

  if (!keyword) return []

  if (skuIndex[keyword]) {
    log("EXACT MATCH")
    const res = await getFromIndex(skuIndex[keyword], keyword)
    timeEnd("SEARCH TOTAL")
    return res
  }

  const prefix = keyword.slice(0, 3)

  if (skuIndex[prefix]) {
    log("PREFIX MATCH:", prefix)
    const res = await getFromIndex(skuIndex[prefix], keyword)
    timeEnd("SEARCH TOTAL")
    return res
  }

  warn("FALLBACK LIMITED SCAN")

  const res = await limitedScan(keyword)

  timeEnd("SEARCH TOTAL")
  return res
}

/* =========================
INDEX SEARCH
========================= */
async function getFromIndex(indexes, keyword) {
  time("INDEX SEARCH")

  let fileMap = {}

  indexes.forEach(i => {
    const f = Math.floor(i / 5000) + 1
    if (!fileMap[f]) fileMap[f] = []
    fileMap[f].push(i)
  })

  log("File terlibat:", Object.keys(fileMap).length)

  const keys = Object.keys(fileMap)
  const files = await Promise.all(keys.map(k => loadFile(k)))

  let results = []

  for (let f = 0; f < keys.length; f++) {
    const data = files[f]

    for (let i of fileMap[keys[f]]) {
      const item = data[i % 5000]
      if (!item) continue

      results.push(item)

      if (results.length >= MAX_RESULT) {
        timeEnd("INDEX SEARCH")
        return results
      }
    }
  }

  timeEnd("INDEX SEARCH")
  return results
}

/* =========================
LIMITED SCAN
========================= */
async function limitedScan(keyword) {
  let results = []

  for (let i = 1; i <= 3; i++) {
    const data = await loadFile(i)

    for (let item of data) {
      const sku = normalize(item.sku)
      const article = normalize(item.article)
      const desc = normalize(item.deskripsi)

      if (
        sku.includes(keyword) ||
        article.includes(keyword) ||
        desc.includes(keyword)
      ) {
        results.push(item)
      }

      if (results.length >= MAX_RESULT) return results
    }
  }

  return results
}

/* =========================
RENDER
========================= */
function render(data) {
  time("RENDER")

  log("Render jumlah:", data.length)

  resultEl.innerHTML = data.map(item => `
    <div class="card">
      <b>${highlight(item.deskripsi, searchInput.value)}</b><br>
      SKU: ${highlight(item.sku, searchInput.value)}<br>
      Article: ${highlight(item.article, searchInput.value)}
    </div>
  `).join("")

  timeEnd("RENDER")
}

/* =========================
EVENT
========================= */
let timer

searchInput.addEventListener("input", e => {
  clearTimeout(timer)

  const val = e.target.value

  if (!isReady) {
    statusEl.innerText = "Loading..."
    return
  }

  timer = setTimeout(async () => {
    if (!val) {
      resultEl.innerHTML = ""
      return
    }

    statusEl.innerText = "Mencari..."

    const res = await searchData(val)

    render(res)

    statusEl.innerText = `Ditemukan ${res.length} data`

  }, 120)
})