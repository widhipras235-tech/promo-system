const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const folders = [
"excel/divisi1",
"excel/divisi2",
"excel/divisi3",
"excel/divisi4"
];

let promo = [];
let skuIndex = {};
let articleIndex = {};

function norm(v){
if(!v) return "";
return String(v).trim();
}

function addItem(item){

promo.push(item);

if(item.sku){
if(!skuIndex[item.sku]) skuIndex[item.sku] = [];
skuIndex[item.sku].push(promo.length-1);
}

if(item.article){
if(!articleIndex[item.article]) articleIndex[item.article] = [];
articleIndex[item.article].push(promo.length-1);
}

}

folders.forEach(folder=>{

if(!fs.existsSync(folder)) return;

fs.readdirSync(folder).forEach(file=>{

if(!file.endsWith(".xlsx")) return;

const filePath = path.join(folder,file);

const wb = XLSX.readFile(filePath);

wb.SheetNames.forEach(sheetName=>{

const rows = XLSX.utils.sheet_to_json(
wb.Sheets[sheetName],
{defval:""}
);

rows.forEach(r=>{

addItem({

deskripsi: norm(r["DESCRIPTION"]),

brand: norm(r["BRAND"]),

sku: norm(r["SKU"]),

article: norm(r["ARTICLE"]),

harga_normal: r["HARGA NORMAL"] || 0,

harga_promo: r["HARGA PROMO"] || 0,

diskon: norm(r["DISKON"]),

berlaku:
norm(r["FROM DATE"]) + " - " + norm(r["TO DATE"]),

acara: norm(r["ACARA"]),

division: norm(r["DIVISION"] || folder),

file: file,

sheet: sheetName

});

});

});

});

});

if(!fs.existsSync("db"))
fs.mkdirSync("db");

fs.writeFileSync("db/promo.json",JSON.stringify(promo));

fs.writeFileSync("db/sku_index.json",JSON.stringify(skuIndex));

fs.writeFileSync("db/article_index.json",JSON.stringify(articleIndex));

console.log("Database selesai dibuat");
console.log("Total promo:",promo.length);