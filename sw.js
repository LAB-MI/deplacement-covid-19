const version = '01'

const files = [
  'index.html',
  'pwa.js',
  'certificate.js',
  // 'certificate.css', // Not working, hash not added later on
  'certificate.pdf',
  'logo_dnum.svg',
  'MIN_Interieur_RVB.svg',
]

const cachePrefix = 'attest-'

const cacheName = cachePrefix + version

const tmp = self.location.pathname.split('/')
delete tmp[tmp.length - 1]
const swLoc = tmp.join('/')

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(cacheName).then(function (cache) {
      return cache.addAll(files)
    }),
  )
})

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.filter(function (cn) {
          return cn.startsWith(cachePrefix) && cn !== cacheName
        }).map(function (cn) {
          return caches.delete(cn)
        }),
      )
    }),
  )
})

self.addEventListener('message', function (event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', function (event) {
  const url = new URL(event.request.url)
  if (url.pathname === swLoc + 'version.json') {
    event.respondWith(Promise.resolve(new Response(JSON.stringify({
      v: 'v' + parseInt(version),
      // time: BUILD_TIME, // @todo how to get it from parcel?
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    })))
    return
  }
  event.respondWith(
    caches.open(cacheName).then(function (cache) {
      return cache.match(url.pathname === swLoc ? 'index.html' : event.request)
        .then(function (response) {
          return response || fetch(event.request).then(function (response) {
            // Add request in cache for later use, basically file we missed in first list
            cache.put(event.request, response.clone())
            return response
          })
        })
    }),
  )
})
