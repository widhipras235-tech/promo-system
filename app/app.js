/* =========================
DEBUG MODE
========================= */
const DEBUG = true

/* =========================
STATE
========================= */
let mainIndex = {}
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

/* =========================
UNIVERSAL FIELD GETTER
========================= */
function getField(item, keys){
  for(let key of keys){
    if(item[key] !== undefined) return item[key]
    if(item.raw && item.raw[key] !== undefined) return item.raw[key]
  }
  return null
}

/* =========================
HELPER FIELD
========================= */
function getSku(item){
  return getField(item, ["sku","SKU","Sku"]) || ""
}

function getArticle(item){
  return getField(item, ["article","Article"]) || ""
}

/* =========================
NORMALIZE
========================= */
function normalize(val){
  return (val || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g,"")
}

/* =========================
PRIORITY
========================= */
function getPriority(item, keyword){
  const sku = normalize(getSku(item))
  const article = normalize(getArticle(item))
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
FORMAT
========================= */
function formatRupiah(num){
  if(!num || isNaN(num)) return "-"
  return "Rp " + Number(num).toLocaleString("id-ID")
}

function formatDiskon(val){
  if(!val) return "-"
  let num = Number(val)
  return num <= 1 ? Math.round(num*100)+"%" : num+"%"
}

function formatTanggal(val){
  if(!val) return "-"

  if(!isNaN(val)){
    const date = new Date((val-25569)*86400*1000)
    return date.toLocaleDateString("id-ID")
  }

  const d = new Date(val)
  if(isNaN(d)) return "-"
  return d.toLocaleDateString("id-ID")
}

/* =========================
LOAD INDEX
========================= */
async function loadIndex(){
  try{
    const res = await fetch("./db/index.json")
    const raw = await res.json()

    raw.forEach(([key,f,p])=>{
      if(!mainIndex[key]) mainIndex[key]=[]
      mainIndex[key].push({fileIndex:f,pos:p})
    })

    isReady = true
    statusEl.innerText="Siap"
  }catch{
    isReady = true
    statusEl.innerText="Fallback mode"
  }
}
loadIndex()

/* =========================
LOAD FILE
========================= */
async function loadFile(i){
  if(cache[i]) return cache[i]

  try{
    const res = await fetch(`./db/promo_${i}.json`)
    const data = await res.json()
    cache[i]=data
    return data
  }catch{
    return []
  }
}

/* =========================
SEARCH
========================= */
async function searchData(keyword){
  keyword = normalize(keyword)
  if(!keyword) return []

  if(mainIndex[keyword]){
    return getExact(mainIndex[keyword],keyword)
  }

  return fullScan(keyword)
}

async function getExact(list,keyword){
  let res=[]

  for(let ref of list){
    const data = await loadFile(ref.fileIndex)
    const item = data[ref.pos]
    if(!item) continue

    const sku = normalize(getSku(item))
    const article = normalize(getArticle(item))

    if(sku===keyword || article===keyword){
      res.push({...item,_priority:getPriority(item,keyword)})
    }
  }

  return res.sort((a,b)=>a._priority-b._priority)
}

async function fullScan(keyword){
  let res=[]

  for(let i=1;i<=TOTAL_FILE;i++){
    const data = await loadFile(i)

    for(let item of data){
      const sku = normalize(getSku(item))
      const article = normalize(getArticle(item))
      const desc = normalize(item.deskripsi)

      if(sku.includes(keyword) || article.includes(keyword) || desc.includes(keyword)){
        res.push({...item,_priority:getPriority(item,keyword)})
      }
    }
  }

  return res.sort((a,b)=>a._priority-b._priority).slice(0,MAX_RESULT)
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

  const keyword = normalize(searchInput.value)

  data.forEach(item=>{

    const hargaNormal = getField(item,["harga_normal","HARGA NORMAL"])
    const hargaPromo = getField(item,["harga_promo","HARGA PROMO"])
    const diskon = getField(item,["diskon","DISKON"])
    const mulai = getField(item,["fromdate","FROM DATE"])
    const akhir = getField(item,["todate","TO DATE"])
    const acara = getField(item,["acara","ACARA"])

    const el=document.createElement("div")
    el.className="card"

    el.innerHTML=`
      <div><b>${item.deskripsi||"-"}</b></div>
      <div>Brand: ${item.brand||"-"}</div>
      <div>SKU: ${getSku(item)}</div>
      <div>Article: ${getArticle(item)}</div>

      <div>Harga Normal: ${formatRupiah(hargaNormal)}</div>
      <div>Harga Promo: ${formatRupiah(hargaPromo)}</div>
      <div>Diskon: ${formatDiskon(diskon)}</div>

      <div>Berlaku: ${formatTanggal(mulai)} - ${formatTanggal(akhir)}</div>
      <div>Acara: ${acara||"-"}</div>
    `

    resultEl.appendChild(el)
  })
}

/* =========================
EVENT
========================= */
searchInput.addEventListener("input",async e=>{
  const val = e.target.value

  if(!val){
    resultEl.innerHTML=""
    return
  }

  const res = await searchData(val)
  render(res)
})