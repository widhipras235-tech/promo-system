const XLSX = require("xlsx")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

const INPUT_FOLDER = "./excel"
const OUTPUT_FOLDER = "./db"
const HASH_FILE = path.join(OUTPUT_FOLDER, "file_hash.json")

/* =========================
HASH FILE
========================= */
function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath)
  return crypto.createHash("md5").update(fileBuffer).digest("hex")
}

/* =========================
LOAD HASH LAMA
========================= */
let oldHash = {}
if (fs.existsSync(HASH_FILE)) {
  oldHash = JSON.parse(fs.readFileSync(HASH_FILE))
}

/* =========================
SCAN FILE
========================= */
function getAllExcelFiles(dir, list = []) {
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const full = path.join(dir, file)
    const stat = fs.statSync(full)

    if (stat.isDirectory()) {
      getAllExcelFiles(full, list)
    } else {
      if (file.startsWith("~$")) return

      const ext = path.extname(file).toLowerCase()
      if ([".xlsx",".xls",".xlsm",".csv"].includes(ext)) {
        list.push(full)
      }
    }
  })

  return list
}

const excelFiles = getAllExcelFiles(INPUT_FOLDER)

/* =========================
FILTER FILE BERUBAH
========================= */
let newHash = {}
let changedFiles = []

excelFiles.forEach(file => {
  const name = path.basename(file)
  const hash = getFileHash(file)

  newHash[name] = hash

  if (oldHash[name] !== hash) {
    changedFiles.push(file)
  }
})

console.log("📂 Total file:", excelFiles.length)
console.log("🔄 File berubah:", changedFiles.length)

if (changedFiles.length === 0) {
  console.log("✅ Tidak ada perubahan")
  process.exit()
}

/* =========================
AI MAPPING
========================= */
function normalizeKey(str){
  return (str||"").toLowerCase().replace(/\s+/g,"").replace(/[^a-z0-9]/g,"")
}

const FIELD = {
  sku:["sku","kode"],
  article:["article","art"],
  deskripsi:["description","nama"],
  harga_normal:["harganormal","price"],
  harga_promo:["hargapromo","sale"],
}

function getVal(row, field){
  const map={}
  for(let k in row) map[normalizeKey(k)]=row[k]

  for(let f of FIELD[field]||[]){
    const key=normalizeKey(f)
    for(let k in map){
      if(k.includes(key)) return map[k]
    }
  }
  return ""
}

/* =========================
LOAD DATA LAMA
========================= */
let DB=[]
const filesDB=fs.readdirSync(OUTPUT_FOLDER).filter(f=>f.startsWith("promo_"))

filesDB.forEach(f=>{
  DB=DB.concat(JSON.parse(fs.readFileSync(path.join(OUTPUT_FOLDER,f))))
})

/* =========================
HAPUS DATA FILE LAMA YANG DIUPDATE
========================= */
const changedNames = changedFiles.map(f=>path.basename(f))

DB = DB.filter(item => !changedNames.includes(item.source))

/* =========================
PROCESS FILE
========================= */
let newData=[]

changedFiles.forEach(file=>{
  console.log("📄 Update:",file)

  const wb=XLSX.readFile(file)

  wb.SheetNames.forEach(s=>{
    const json=XLSX.utils.sheet_to_json(wb.Sheets[s],{defval:""})

    json.forEach(row=>{
      newData.push({
        sku:getVal(row,"sku"),
        article:getVal(row,"article"),
        deskripsi:getVal(row,"deskripsi"),
        harga_normal:getVal(row,"harga_normal"),
        harga_promo:getVal(row,"harga_promo"),
        source:path.basename(file)
      })
    })
  })
})

/* =========================
MERGE
========================= */
const finalData = DB.concat(newData)

/* =========================
SPLIT
========================= */
const SPLIT=5000
let count=0

for(let i=0;i<finalData.length;i+=SPLIT){
  fs.writeFileSync(
    path.join(OUTPUT_FOLDER,`promo_${count+1}.json`),
    JSON.stringify(finalData.slice(i,i+SPLIT))
  )
  count++
}

/* =========================
SAVE HASH
========================= */
fs.writeFileSync(HASH_FILE, JSON.stringify(newHash))

console.log("===================================")
console.log("✅ SMART SYNC SELESAI")
console.log("Data Total:",finalData.length)
console.log("File diupdate:",changedFiles.length)
console.log("===================================")