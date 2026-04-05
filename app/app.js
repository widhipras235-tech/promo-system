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
NORMALIZE (FIX UTAMA)
========================= */
function normalize(val) {  
  return (val || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

/* =========================  
INIT  
========================= */  
let stream = null

/* =========================  
GESTURE STATE
========================= */
let isDrawing = false
let startX = 0
let startY = 0
let endX = 0
let endY = 0

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
    alert("Kamera gagal: " + err.message)
  }
})

/* =========================  
GESTURE TOUCH
========================= */
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

video.addEventListener("touchend", async () => {
  if (!isDrawing) return
  isDrawing = false

  overlayCtx.clearRect(0, 0, overlay.width, overlay.height)

  if (video.videoWidth === 0) return

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

  ctx.filter = "grayscale(1) contrast(2)"
  ctx.drawImage(video, 0, 0)
  ctx.filter = "none"

  const tempCanvas = document.createElement("canvas")
  tempCanvas.width = w
  tempCanvas.height = h

  tempCanvas.getContext("2d")
    .drawImage(canvas, x, y, w, h, 0, 0, w, h)

  statusEl.innerText = "Membaca..."

  const result = await Tesseract.recognize(tempCanvas, "eng")

  let text = result.data.text || ""
  text = text.replace(/[^0-9]/g, " ").trim()

  let keyword = text.split(" ").sort((a,b)=>b.length-a.length)[0]

  if (!keyword) {
    statusEl.innerText = "SKU tidak terbaca"
    return
  }

  searchInput.value = keyword
  searchInput.dispatchEvent(new Event("input"))

  stopCamera()
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

  overlayCtx.clearRect(0, 0, overlay.width, overlay.height)
}

btnClose?.addEventListener("click", stopCamera)

/* =========================  
STATUS PROMO  
========================= */  
function getStatusPromo(mulai, akhir) {
  const now = new Date()

  const start = new Date(!isNaN(mulai) ? (mulai-25569)*86400*1000 : mulai)
  const end = new Date(!isNaN(akhir) ? (akhir-25569)*86400*1000 : akhir)

  if (isNaN(start) || isNaN(end)) return "Tidak diketahui"
  if (now < start) return "Belum aktif"
  if (now > end) return "Berakhir"
  return "Aktif"
}

function getStatusPriority(s){
  return s==="Aktif"?1:s==="Belum aktif"?2:s==="Berakhir"?3:99
}

/* =========================  
PRIORITY  
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

/* =========================  
LOAD INDEX  
========================= */  
async function loadIndex() {  
  try {  
    const [s,a]=await Promise.all([
      fetch("./db/sku_index.json"),
      fetch("./db/article_index.json")
    ])

    if(s.ok) skuIndex=await s.json()
    if(a.ok) articleIndex=await a.json()

    isReady=true
    statusEl.innerText="Siap"
  } catch {
    isReady=true
    statusEl.innerText="Fallback"
  }
}
loadIndex()

/* =========================  
LOAD FILE  
========================= */  
async function loadFile(i){
  if(cache[i]) return cache[i]

  const res=await fetch(`./db/promo_${i}.json`)
  if(!res.ok) return []

  const d=await res.json()
  cache[i]=d
  return d
}

/* =========================  
SEARCH ENGINE FINAL  
========================= */  
async function searchData(keyword){

  let keywords = keyword
    .toLowerCase()
    .split(" ")
    .map(k=>normalize(k))
    .filter(k=>k)

  if (!keywords.length) return []

  const main = keywords[0]

  // EXACT
  if(skuIndex[main]) return await getExact(skuIndex[main],main)
  if(articleIndex[main]) return await getExact(articleIndex[main],main)

  // PREFIX (SKU + ARTICLE)
  let indexes=new Set()
  let prefix=main.slice(0,3)

  for(let k in skuIndex){
    if(k.startsWith(prefix) && k.startsWith(main)){
      skuIndex[k].forEach(i=>indexes.add(i))
    }
  }

  for(let k in articleIndex){
    if(k.startsWith(prefix) && k.startsWith(main)){
      articleIndex[k].forEach(i=>indexes.add(i))
    }
  }

  if(indexes.size>0) return await getFromIndex(indexes,main)

  // FULL SCAN FILTERED
  return await fullScan(keywords)
}

/* =========================  
EXACT  
========================= */
async function getExact(list,keyword){
  let r=[]
  for(let i of list){
    const f=Math.floor(i/5000)+1
    const d=await loadFile(f)
    const item=d[i%5000]
    if(!item) continue

    r.push({
      ...item,
      _priority:getPriority(item,keyword),
      _status:getStatusPromo(item.fromdate,item.todate),
      _statusPriority:getStatusPriority(getStatusPromo(item.fromdate,item.todate))
    })
  }
  return r.sort((a,b)=>a._priority-b._priority).slice(0,MAX_RESULT)
}

/* =========================  
INDEX RESULT  
========================= */
async function getFromIndex(indexes,keyword){
  let r=[]
  for(let i of indexes){
    const f=Math.floor(i/5000)+1
    const d=await loadFile(f)
    const item=d[i%5000]
    if(!item) continue

    r.push({
      ...item,
      _priority:getPriority(item,keyword),
      _status:getStatusPromo(item.fromdate,item.todate),
      _statusPriority:getStatusPriority(getStatusPromo(item.fromdate,item.todate))
    })
  }
  return r.sort((a,b)=>a._priority-b._priority).slice(0,MAX_RESULT)
}

/* =========================  
FULL SCAN FILTERED  
========================= */
async function fullScan(keywords){
  let r=[]

  for(let i=1;i<=TOTAL_FILE;i++){
    const data=await loadFile(i)

    for(let item of data){
      const sku=normalize(item.sku)
      const art=normalize(item.article)
      const desc=normalize(item.deskripsi)

      const match = keywords.every(k =>
        sku.includes(k) ||
        art.includes(k) ||
        desc.includes(k)
      )

      if(match){
        r.push({
          ...item,
          _priority:getPriority(item,keywords[0]),
          _status:getStatusPromo(item.fromdate,item.todate),
          _statusPriority:getStatusPriority(getStatusPromo(item.fromdate,item.todate))
        })
      }

      if(r.length>=MAX_RESULT) break
    }
  }

  return r.sort((a,b)=>a._priority-b._priority).slice(0,MAX_RESULT)
}

/* =========================  
RENDER  
========================= */  
function render(data){
  resultEl.innerHTML=""

  if(!data.length){
    resultEl.innerHTML="<p>Data tidak ditemukan</p>"
    return
  }

  data.forEach(i=>{
    const el=document.createElement("div")
    el.className="card"

    el.innerHTML=`
    <b>${i.deskripsi||"-"}</b>
    <div>SKU: ${i.sku||"-"}</div>
    <div>Article: ${i.article||"-"}</div>
    <div>Promo: ${i.harga_promo||"-"}</div>
    <div>Status: ${i._status}</div>
    `
    resultEl.appendChild(el)
  })
}

/* =========================  
EVENT  
========================= */  
let timer
searchInput.addEventListener("input",e=>{
  clearTimeout(timer)

  if(!isReady) return

  timer=setTimeout(async()=>{
    const k=e.target.value
    if(!k) return

    statusEl.innerText="Mencari..."
    const res=await searchData(k)
    render(res)
    statusEl.innerText=`${res.length} ditemukan`
  },200)
})