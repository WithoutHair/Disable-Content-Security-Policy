let isRunning = false

let getCurrentTab = async () => {
  let queryOptions = { active: true, lastFocusedWindow: true }
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions)

  return tab
}

let isCSPDisabled = async () => {
  let rules = await chrome.declarativeNetRequest.getSessionRules(),
    urls = rules.map(rule => rule.condition.urlFilter),
    {url} = await getCurrentTab()

  return urls.some(item => item === url)
}

let updateUI = async () => {
  let isDisabled = await isCSPDisabled(),
    iconColor = isDisabled ? '' : '_gray',
    title = isDisabled ? 'is' : 'is not'

  chrome.action.setIcon({ path: `icon/cola${iconColor}.png` })
  chrome.action.setTitle({ title: `The extension ${title} working` })
}

let disableCSP = async (id) => {
  if (isRunning) return
  isRunning = true
  
  let addRules = [],
    removeRuleIds = [],
    {url} = await getCurrentTab()

  if (!await isCSPDisabled()) {
    addRules.push({
      id,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [{ header: 'content-security-policy', operation: 'set', value: '' }]
      },
      condition: {urlFilter: url, resourceTypes: ['main_frame', 'sub_frame']}
    })

    chrome.browsingData.remove({}, { serviceWorkers: true }, () => {})
  } else {
    let rules = await chrome.declarativeNetRequest.getSessionRules()

    rules.forEach(rule => {
      if (rule.condition.urlFilter === url) {
        removeRuleIds.push(rule.id)
      }
    })
  }

  await chrome.declarativeNetRequest.updateSessionRules({addRules, removeRuleIds})
  
  await updateUI()
  isRunning = false
}

let init = () => {
  // When the user clicks the plugin icon
  chrome.action.onClicked.addListener((tab) => {
    disableCSP(tab.id)
  })

  // When the user changes tab
  chrome.tabs.onActivated.addListener(() => {
    updateUI()
  })
}

init()
