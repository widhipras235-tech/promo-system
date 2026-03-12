const CACHE="promo-v1"

self.addEventListener("install",e=>{

e.waitUntil(

caches.open(CACHE)

.then(cache=>cache.addAll([

"/app/index.html",
"/app/app.js",
"/app/style.css"

]))

)

})

self.addEventListener("fetch",e=>{

e.respondWith(

caches.match(e.request)

.then(r=>r||fetch(e.request))

)

})