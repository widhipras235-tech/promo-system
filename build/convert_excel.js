const fs = require("fs")
const path = require("path")
const XLSX = require("xlsx")

const BASE = "excel"
const OUTPUT = "db"
const SPLIT_SIZE = 1000

let promo = []
let skuIndex = {}
let articleIndex = {}

function norm(v){
if(!v) return ""
return String(v).trim()
}

function find(row,keys){

for(let k in row){

const name = k.toUpperCase()

for(let key of keys){

if(name.includes(key))
return row[k]

}

}

return ""

}

function excelDate(v){

if(!v) return ""

if(typeof v==="number"){

const d = XLSX.SSF.parse_date_code(v)

return `${d.d}-${d.m}-${d.y}`

}

return String(v)

}

console.log("SCAN FOLDER EXCEL...")

const folders = fs.readdirSync(BASE)

folders.forEach(div=>{

const folder = path.join(BASE,div)

if(!fs.statSync(folder).isDirectory()) return

console.log("DIVISI:",div)

const files = fs.readdirSync(folder)

files.forEach(file=>{

if(!file.endsWith(".xlsx")) return

const filePath = path.join(folder,file)

console.log("FILE:",file)

const wb = XLSX.readFile(filePath,{cellDates:true})

wb.SheetNames.forEach(sheetName=>{

console.log("SHEET:",sheetName)

const rows = XLSX.utils.sheet_to_json(
wb.Sheets[sheetName],
{raw:false,defval:""}
)

rows.forEach(r=>{

const hargaNormal = find(r,["NORMAL","REG"])
const hargaPromo = find(r,["PROMO","SHARP","SPECIAL"])

const item = {

deskripsi: norm(find(r,["DESC","DESCR","DESCRIPTION"])),

brand: norm(find(r,["BRAND"])),

sku: norm(find(r,["SKU","BARCODE"])),

article: norm(find(r,["ARTICLE","STYLE"])),

harga_normal: norm(hargaNormal),

harga_promo: norm(hargaPromo),

diskon: norm(find(r,["DISC","DISCOUNT"])),

berlaku:
excelDate(find(r,["FROM","START"])) +
" - " +
excelDate(find(r,["TO","END"])),

acara: norm(find(r,["EVENT","ACARA","PROMO"])),

division: div,

file: file,

sheet: sheetName

}

promo.push(item)

const i = promo.length-1

if(item.sku){

if(!skuIndex[item.sku])
skuIndex[item.sku]=[]

skuIndex[item.sku].push(i)

}

if(item.article){

if(!articleIndex[item.article])
articleIndex[item.article]=[]

articleIndex[item.article].push(i)

}

})

})

})

})

if(!fs.existsSync(OUTPUT))
fs.mkdirSync(OUTPUT)

console.log("TOTAL DATA:",promo.length)

fs.writeFileSync(
`${OUTPUT}/promo.json`,
JSON.stringify(promo)
)

fs.writeFileSync(
`${OUTPUT}/sku_index.json`,
JSON.stringify(skuIndex)
)

fs.writeFileSync(
`${OUTPUT}/article_index.json`,
JSON.stringify(articleIndex)
)

console.log("SPLIT DATABASE...")

let part = 1

for(let i=0;i<promo.length;i+=SPLIT_SIZE){

const chunk = promo.slice(i,i+SPLIT_SIZE)

fs.writeFileSync(
`${OUTPUT}/promo_${part}.json`,
JSON.stringify(chunk)
)

part++

}

console.log("CONVERT SELESAI")
console.log("TOTAL FILE SPLIT:",part-1)