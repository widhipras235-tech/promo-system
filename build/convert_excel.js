const fs = require("fs")
const path = require("path")
const XLSX = require("xlsx")

const BASE="excel"

const DIVISI=[
"divisi1",
"divisi2",
"divisi3",
"divisi4"
]

let promo=[]
let skuIndex={}
let articleIndex={}

function norm(v){
if(!v) return ""
return String(v).trim()
}

function find(row,keys){

for(let k in row){

const name=k.toUpperCase()

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

const d=XLSX.SSF.parse_date_code(v)

return `${d.d}-${d.m}-${d.y}`

}

return String(v)

}

DIVISI.forEach(div=>{

const folder=path.join(BASE,div)

if(!fs.existsSync(folder)) return

const files=fs.readdirSync(folder)

files.forEach(file=>{

if(!file.endsWith(".xlsx")) return

const filePath=path.join(folder,file)

const wb=XLSX.readFile(filePath,{cellDates:true})

wb.SheetNames.forEach(sheetName=>{

const rows=XLSX.utils.sheet_to_json(
wb.Sheets[sheetName],
{raw:false,defval:""}
)

rows.forEach(r=>{

const hargaNormal=find(r,["NORMAL"])
const hargaPromo=find(r,["PROMO","SHARP","SPECIAL"])

const item={

deskripsi:norm(find(r,["DESC"])),

brand:norm(find(r,["BRAND"])),

sku:norm(find(r,["SKU"])),

article:norm(find(r,["ARTICLE"])),

harga_normal:norm(hargaNormal),

harga_promo:norm(hargaPromo),

diskon:norm(find(r,["DISC"])),

berlaku:
excelDate(find(r,["FROM"]))+
" - "+
excelDate(find(r,["TO"])),

acara:norm(find(r,["EVENT","ACARA"])),

division:div,

file:file,

sheet:sheetName

}

promo.push(item)

const i=promo.length-1

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

if(!fs.existsSync("db"))
fs.mkdirSync("db")

fs.writeFileSync(
"db/promo.json",
JSON.stringify(promo,null,2)
)

fs.writeFileSync(
"db/sku_index.json",
JSON.stringify(skuIndex)
)

fs.writeFileSync(
"db/article_index.json",
JSON.stringify(articleIndex)
)

console.log("DATABASE SELESAI")
console.log("TOTAL PROMO:",promo.length)