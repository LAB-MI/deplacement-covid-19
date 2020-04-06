if ('serviceWorker' in navigator && document.body.dataset.sw) {
  window.addEventListener('load', () => {
    // Show the update button to the user and wait for a click on it
    const _reqUpdate = function () {
      return new Promise(function (resolve, reject) {
        const refreshButton = document.getElementById('refreshBut')
        refreshButton.classList.remove('hide')

        refreshButton.addEventListener('click', function (e) {
          resolve()
        })

        document.body.appendChild(refreshButton)
      })
    }

    // Call this function when an update is ready to show the button and request update
    const _updateReady = function (worker) {
      return _reqUpdate()
        .then(function () {
          // post message to worker to make him call skiWaiting for us
          worker.postMessage({
            action: 'skipWaiting',
          })
        })
        .catch(() => {
          console.log('Rejected new version')
        })
    }

    // Track state change on worker and request update when ready
    const _trackInstalling = function (worker) {
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') {
          _updateReady(worker)
        }
      })
    }

    const showVersion = function () {
      // @todo add it somewhere
      const version = document.getElementById('version')
      if (version && version.dataset.v) {
        fetch(version.dataset.v)
          .then(function (response) {
            return response.json()
          })
          .then(function (response) {
            const date = new Date(response.time)
            version.innerText = response.v + ' - ' + date // @todo format date
          })
      }
    }

    let refreshing
    // When skiwaiting is called, reload the page only once
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) {
        return
      }
      refreshing = true
      window.location.reload()
    })

    navigator.serviceWorker.register(document.body.dataset.sw).then((registration) => {
      if (!navigator.serviceWorker.controller) {
        return
      }

      showVersion()

      if (registration.waiting) {
        // There is another SW waiting, the user can switch
        _updateReady(registration.waiting)
        return
      }

      if (registration.installing) {
        // There is another SW installing, listen to it to know when it's ready/waiting
        _trackInstalling(registration.installing)
        return
      }

      // If an update if found later, track the installing too
      registration.addEventListener('updatefound', () => {
        _trackInstalling(registration.installing)
      })
    }, (err) => {
      console.log('ServiceWorker registration failed: ', err)
    })
  })
}

// Prompt install
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault()
  let deferredPrompt = e

  const installButton = document.getElementById('installBut')
  installButton.classList.remove('hide')

  installButton.addEventListener('click', function (e) {
    deferredPrompt.prompt()

    // Follow what the user has done with the prompt.
    deferredPrompt.userChoice.then(function (choiceResult) {
      console.log(choiceResult.outcome)

      if (choiceResult.outcome === 'dismissed') {
        // @todo show him an alert here?
        console.log('User cancelled home screen install')
      } else {
        console.log('User added to home screen')
      }

      installButton.parentNode.removeChild(installButton)

      // We no longer need the prompt.  Clear it up.
      deferredPrompt = null
    })
  })

  document.body.appendChild(installButton)
})
