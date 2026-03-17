const fs = require("fs")
const path = require("path")
const XLSX = require("xlsx")

const BASE = "excel"

const DIVISI = [
"divisi1",
"divisi2",
"divisi3",
"divisi4"
]

let promo = []

/* =========================
NORMALIZER
========================= */

function clean(str){
return String(str||"")
.toLowerCase()
.replace(/\s/g,"")
.replace(/[^a-z0-9]/g,"")
}

function norm(v){
return String(v||"").trim()
}

/* =========================
SMART COLUMN DETECTOR (AI)
========================= */

function detect(row){

let map = {
sku:"",
article:"",
deskripsi:"",
brand:"",
normal:"",
promo:"",
diskon:"",
from:"",
to:"",
event:""
}

for(let key in row){

let k = clean(key)
let val = row[key]

/* SKU DETECTION */
if(
k.includes("sku") ||
k.includes("barcode") ||
k.includes("plu") ||
k.includes("kodebarang") ||
k.includes("kodeitem")
){
map.sku = val
}

/* ARTICLE */
if(
k.includes("artikel") ||
k.includes("article") ||
k.includes("style") ||
k.includes("item")
){
map.article = val
}

/* DESKRIPSI */
if(
k.includes("desc") ||
k.includes("nama") ||
k.includes("produk") ||
k.includes("description")
){
map.deskripsi = val
}

/* BRAND */
if(k.includes("brand")){
map.brand = val
}

/* HARGA NORMAL */
if(
k.includes("normal") ||
k.includes("hargaawal") ||
k.includes("price")
){
map.normal = val
}

/* HARGA PROMO */
if(
k.includes("promo") ||
k.includes("special") ||
k.includes("sharp")
){
map.promo = val
}

/* DISKON */
if(
k.includes("disc") ||
k.includes("diskon")
){
map.diskon = val
}

/* DATE FROM */
if(
k.includes("from") ||
k.includes("start") ||
k.includes("mulai")
){
map.from = val
}

/* DATE TO */
if(
k.includes("to") ||
k.includes("end") ||
k.includes("akhir")
){
map.to = val
}

/* EVENT */
if(
k.includes("event") ||
k.includes("acara")
){
map.event = val
}

}

return map
}

/* =========================
DATE FIX
========================= */

function excelDate(v){

if(!v) return ""

if(typeof v === "number"){

const d = XLSX.SSF.parse_date_code(v)

return `${d.d}-${d.m}-${d.y}`

}

return String(v)
}

/* =========================
PROCESS EXCEL
========================= */

DIVISI.forEach(div=>{

const folder = path.join(BASE,div)

if(!fs.existsSync(folder)) return

const files = fs.readdirSync(folder)

files.forEach(file=>{

if(!file.endsWith(".xlsx")) return

const filePath = path.join(folder,file)

const wb = XLSX.readFile(filePath,{cellDates:true})

wb.SheetNames.forEach(sheetName=>{

const rows = XLSX.utils.sheet_to_json(
wb.Sheets[sheetName],
{defval:""}
)

rows.forEach(r=>{

const d = detect(r)

/* VALIDASI (ANTI DATA KOSONG) */

if(
!d.sku &&
!d.article &&
!d.deskripsi
){
return
}

const item = {

deskripsi: norm(d.deskripsi),
brand: norm(d.brand),
sku: norm(d.sku),
article: norm(d.article),

harga_normal: norm(d.normal),
harga_promo: norm(d.promo),
diskon: norm(d.diskon),

berlaku:
excelDate(d.from)+" - "+excelDate(d.to),

acara: norm(d.event),

division: div,
file: file,
sheet: sheetName

}

promo.push(item)

/* DEBUG KHUSUS (biar ketahuan error file) */
if(!item.sku){
console.log("SKU KOSONG:", file, sheetName, item.deskripsi)
}

})

})

})

})

/* =========================
SPLIT DATABASE
========================= */

if(!fs.existsSync("db")){
fs.mkdirSync("db")
}

const chunk = 1000
let index = 1

for(let i=0;i<promo.length;i+=chunk){

const part = promo.slice(i,i+chunk)

fs.writeFileSync(
`db/promo_${index}.json`,
JSON.stringify(part,null,2)
)

index++

}

/* MASTER FILE */

fs.writeFileSync(
"db/promo.json",
JSON.stringify(promo,null,2)
)

console.log("================================")
console.log("DATABASE SELESAI")
console.log("TOTAL PROMO:", promo.length)
console.log("TOTAL FILE SPLIT:", index-1)
console.log("================================")