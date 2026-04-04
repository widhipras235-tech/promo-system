/* =========================  
STATE  
========================= */  
let skuIndex = {}  
let articleIndex = {}  
let cache = {}  
let isReady = false  

const MAX_RESULT = 30  
const TOTAL_FILE = 100  
const MAX_CACHE = 20  

let stream = null
let captured = false
let originalImage = null

let isDown = false
let startX = 0
let startY = 0
let endX = 0
let endY = 0

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

const btnClose = document.getElementById("btnClose")

/* =========================  
INIT  
========================= */  
function normalize(val) {  
  return (val || "").toString().toLowerCase().trim()  
}  

/* =========================  
CAMERA FINAL STABLE  
========================= */

btnCamera.onclick = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    })

    video.srcObject = stream
    video.play()

    video.style.display = "block"
    canvas.style.display = "none"

    statusEl.innerText = "Tap layar untuk foto"

  } catch (e) {
    alert("Kamera gagal: " + e.message)
  }
}

video.onclick = () => {
  if (!stream) return

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  ctx.drawImage(video, 0, 0)
  originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height)

  stream.getTracks().forEach(t => t.stop())
  stream = null

  video.style.display = "none"
  canvas.style.display = "block"

  captured = true

  statusEl.innerText = "Geser untuk pilih area"
}

canvas.onpointerdown = (e) => {
  if (!captured) return
  isDown = true
  startX = e.offsetX
  startY = e.offsetY
}

canvas.onpointermove = (e) => {
  if (!isDown) return
  endX = e.offsetX
  endY = e.offsetY
  redraw()
}

canvas.onpointerup = async () => {
  if (!isDown) return
  isDown = false

  const x = Math.min(startX, endX)
  const y = Math.min(startY, endY)
  const w = Math.abs(endX - startX)
  const h = Math.abs(endY - startY)

  if (w < 30 || h < 20) {
    statusEl.innerText = "Area terlalu kecil"
    return
  }

  const temp = document.createElement("canvas")
  temp.width = w
  temp.height = h

  temp.getContext("2d").drawImage(
    canvas,
    x, y, w, h,
    0, 0, w, h
  )

  statusEl.innerText = "Membaca..."

  try {
    const res = await Tesseract.recognize(temp, "eng")

    let text = res.data.text || ""
    text = text.replace(/[^a-zA-Z0-9]/g, " ").trim()

    let keyword = text.split(" ").sort((a, b) => b.length - a.length)[0]

    if (!keyword) {
      statusEl.innerText = "Tidak terbaca"
      return
    }

    searchInput.value = keyword
    searchInput.dispatchEvent(new Event("input"))

    statusEl.innerText = "Selesai"

    resetCamera()

  } catch (err) {
    console.error(err)
    statusEl.innerText = "OCR gagal"
  }
}

function redraw() {
  if (originalImage) {
    ctx.putImageData(originalImage, 0, 0)
  }

  ctx.strokeStyle = "lime"
  ctx.lineWidth = 2
  ctx.strokeRect(
    startX,
    startY,
    endX - startX,
    endY - startY
  )
}

function resetCamera() {
  canvas.style.display = "none"
  video.style.display = "block"
  captured = false
}

btnClose?.onclick = () => {
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
  resetCamera()
}

/* =========================  
STATUS PROMO  
========================= */  
function getStatusPromo(mulai, akhir) {
  const now = new Date()

  const start = new Date(!isNaN(mulai) ? (Number(mulai) - 25569) * 86400 * 1000 : mulai)
  const end = new Date(!isNaN(akhir) ? (Number(akhir) - 25569) * 86400 * 1000 : akhir)

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
LOAD FILE (CACHE)  
========================= */  
async function loadFile(fileIndex) {  
  try {  
    if (cache[fileIndex]) return cache[fileIndex]  

    const res = await fetch(`./db/promo_${fileIndex}.json`)  
    if (!res.ok) return []  

    const data = await res.json()  

    if (Object.keys(cache).length > MAX_CACHE) {
      cache = {}
    }

    cache[fileIndex] = data  

    return data  
  } catch {  
    return []  
  }  
}  

/* =========================  
SORT FINAL  
========================= */  
function finalSort(results) {
  return results.sort((a, b) => {
    if (a._statusPriority !== b._statusPriority) {
      return a._statusPriority - b._statusPriority
    }
    return a._priority - b._priority
  })
}

/* =========================  
FULL SCAN (FIX FILTER)  
========================= */  
async function fullScanSearch(keyword) {  
  let results = []  
  keyword = normalize(keyword)  

  for (let i = 1; i <= TOTAL_FILE; i++) {  
    const data = await loadFile(i)  

    for (let item of data) {  
      const text = normalize(item.sku + " " + item.article + " " + item.deskripsi)
      if (!text.includes(keyword)) continue

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

  return finalSort(results).slice(0, MAX_RESULT)
}  

/* =========================  
SEARCH ENGINE (FIX PREFIX)  
========================= */  
async function searchData(keyword) {  
  keyword = normalize(keyword)  
  if (!keyword) return []  

  let indexes = new Set()  
  let prefix = keyword.length >= 3 ? keyword.slice(0, 3) : keyword  

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