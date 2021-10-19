// ==UserScript==
// @name         YourSports Stream
// @description  Watch videos in external player.
// @version      2.1.2
// @match        *://yoursports.stream/*
// @match        *://*.yoursports.stream/*
// @match        *://yoursports.to/*
// @match        *://*.yoursports.to/*
// @match        *://yrsprts.stream/*
// @match        *://*.yrsprts.stream/*
// @match        *://yrsprts.io/*
// @match        *://*.yrsprts.io/*
// @match        *://findsports.stream/*
// @match        *://*.findsports.stream/*
// @icon         http://yoursports.to/favicon.ico
// @run-at       document-end
// @homepage     https://github.com/warren-bank/crx-YourSports-Stream/tree/webmonkey-userscript/es5
// @supportURL   https://github.com/warren-bank/crx-YourSports-Stream/issues
// @downloadURL  https://github.com/warren-bank/crx-YourSports-Stream/raw/webmonkey-userscript/es5/webmonkey-userscript/YourSports-Stream.user.js
// @updateURL    https://github.com/warren-bank/crx-YourSports-Stream/raw/webmonkey-userscript/es5/webmonkey-userscript/YourSports-Stream.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// ----------------------------------------------------------------------------- constants

var user_options = {
  "common": {
    "emulate_webmonkey":            false
  },
  "webmonkey": {
    "post_intent_redirect_to_url":  "about:blank"
  },
  "greasemonkey": {
    "redirect_to_webcast_reloaded": true,
    "force_http":                   true,
    "force_https":                  false
  }
}

// ----------------------------------------------------------------------------- state

var state = {
  "current_window": null,
  "webmonkey":      false
}

// ----------------------------------------------------------------------------- URL links to tools on Webcast Reloaded website

var get_webcast_reloaded_url = function(video_url, vtt_url, referer_url, force_http, force_https) {
  force_http  = (typeof force_http  === 'boolean') ? force_http  : user_options.greasemonkey.force_http
  force_https = (typeof force_https === 'boolean') ? force_https : user_options.greasemonkey.force_https

  var encoded_video_url, encoded_vtt_url, encoded_referer_url, webcast_reloaded_base, webcast_reloaded_url

  encoded_video_url     = encodeURIComponent(encodeURIComponent(btoa(video_url)))
  encoded_vtt_url       = vtt_url ? encodeURIComponent(encodeURIComponent(btoa(vtt_url))) : null
  referer_url           = referer_url ? referer_url : state.current_window.location.href
  encoded_referer_url   = encodeURIComponent(encodeURIComponent(btoa(referer_url)))

  webcast_reloaded_base = {
    "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html",
    "http":  "http://webcast-reloaded.surge.sh/index.html"
  }

  webcast_reloaded_base = (force_http)
                            ? webcast_reloaded_base.http
                            : (force_https)
                               ? webcast_reloaded_base.https
                               : (video_url.toLowerCase().indexOf('http:') === 0)
                                  ? webcast_reloaded_base.http
                                  : webcast_reloaded_base.https

  webcast_reloaded_url  = webcast_reloaded_base + '#/watch/' + encoded_video_url + (encoded_vtt_url ? ('/subtitle/' + encoded_vtt_url) : '') + '/referer/' + encoded_referer_url
  return webcast_reloaded_url
}

// ----------------------------------------------------------------------------- URL redirect

var redirect_to_url = function(url) {
  if (!url) return

  if (state.webmonkey) {
    if (typeof GM_resolveUrl === 'function')
      url = GM_resolveUrl(url, state.current_window.location.href) || url

    GM_loadUrl(url, 'Referer', state.current_window.location.href)
  }
  else {
    try {
      unsafeWindow.top.location = url
    }
    catch(e) {
      unsafeWindow.window.location = url
    }
  }
}

var process_webmonkey_post_intent_redirect_to_url = function() {
  var url = null

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'string')
    url = user_options.webmonkey.post_intent_redirect_to_url

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'function')
    url = user_options.webmonkey.post_intent_redirect_to_url()

  if (typeof url === 'string')
    redirect_to_url(url)
}

var process_video_url = function(video_url, video_type, vtt_url, referer_url) {
  if (!referer_url)
    referer_url = state.current_window.location.href

  if (state.webmonkey) {
    // running in Android-WebMonkey: open Intent chooser

    var args = [
      /* action = */ 'android.intent.action.VIEW',
      /* data   = */ video_url,
      /* type   = */ video_type
    ]

    // extras:
    if (vtt_url) {
      args.push('textUrl')
      args.push(vtt_url)
    }
    if (referer_url) {
      args.push('referUrl')
      args.push(referer_url)
    }

    GM_startIntent.apply(this, args)
    process_webmonkey_post_intent_redirect_to_url()
    return true
  }
  else if (user_options.greasemonkey.redirect_to_webcast_reloaded) {
    // running in standard web browser: redirect URL to top-level tool on Webcast Reloaded website

    redirect_to_url(get_webcast_reloaded_url(video_url, vtt_url, referer_url))
    return true
  }
  else {
    return false
  }
}

var process_hls_url = function(hls_url, vtt_url, referer_url) {
  return process_video_url(/* video_url= */ hls_url, /* video_type= */ 'application/x-mpegurl', vtt_url, referer_url)
}

var process_dash_url = function(dash_url, vtt_url, referer_url) {
  return process_video_url(/* video_url= */ dash_url, /* video_type= */ 'application/dash+xml', vtt_url, referer_url)
}

// ----------------------------------------------------------------------------- display message

var display_message = function(msg) {
  if (state.webmonkey) {
    // running in Android-WebMonkey: show Toast
    GM_toastShort(msg)
  }
  else {
    // running in standard web browser: show alert dialog
    unsafeWindow.alert(msg)
  }
}

// ----------------------------------------------------------------------------- update DOM for current channel

var update_window_DOM = function(show_error, win) {
  if (win && (win === win.top) && (win.location.pathname.toLowerCase().indexOf('/live') === 0)) {
    var player = win.document.getElementById('player')

    if (player) {
      win.document.body.innerHTML = ''
      win.document.body.appendChild(player)

      if (show_error)
        display_message('video not found')
    }

    return !!player
  }
}

var update_page_DOM = function(show_error) {
  try {
    if (update_window_DOM(show_error, unsafeWindow.top)) return
  }
  catch(e){}

  try {
    if (update_window_DOM(show_error, unsafeWindow.window)) return
  }
  catch(e){}
}

// ----------------------------------------------------------------------------- process video for current channel

/*
 * page:   http://yoursports.stream/live?v=cnnnews
 * iframe: view-source:http://yoursports.stream/ing/cnnnews
 * source: var mustave = atob('base64 string...')
 *
 * page:   http://yoursports.stream/live?v=cbs
 * iframe: view-source:http://yoursports.stream/ing/cbs
 * source: var rbnhd = 'base64 string...';
 *         ...,'source':{'hls':atob(rbnhd)}
 *
 * page:   http://yoursports.stream/live?v=espn
 * iframe: view-source:http://yoursports.stream/ing/espn
 * iframe: view-source:http://eu-33.findsports.stream/ustv.php?ch=espn
 * source: var mustave = atob('base64 string...')
 */

var regex = {
  script_parsers: [
    /\s*=\s*atob\('([^']+)'\)/,
    [
      /['"]source['"]\s*:\s*\{\s*['"]hls['"]\s*:\s*atob\(rbnhd\)\s*\}/,
      /var\s+rbnhd\s*=\s*['"]([^'"]+)['"]/
    ]
  ],
  url_parsers: {
    path_pre:  /^(?:https?:)?\/\/[^\/]+/i,
    path_post: /[^\/]+$/,
    host_pre:  /^(?:https?:)?\/\//i,
    is_base64: /^[-a-zA-Z0-9+/]+={0,3}$/
  },
  iframes: {
    follow_path: /^\/(?:ing\/|ustv\.php)/i
  }
}

var resolve_url = function(url, determine_sameorigin) {
  if (regex.url_parsers.is_base64.test(url))
    url = atob(url)

  var resolved = {
    href: url,
    path: null
  }

  if (determine_sameorigin)
    resolved.sameorigin = true

  if (regex.url_parsers.path_pre.test(resolved.href)) {
    // url includes protocol and host
    resolved.path = resolved.href.replace(regex.url_parsers.path_pre, '')

    if (resolved.href.substring(0, 2) === '//')
      resolved.href = state.current_window.location.protocol + resolved.href

    if (determine_sameorigin)
      resolved.sameorigin = (url.toLowerCase().replace(regex.url_parsers.host_pre, '').indexOf( state.current_window.location.host.toLowerCase() ) === 0)
  }
  else if (resolved.href[0] === '/') {
    // url is an absolute path
    resolved.path = resolved.href
    resolved.href = state.current_window.location.protocol + '//' + state.current_window.location.host + resolved.path
  }
  else {
    // url is a relative path
    resolved.path = state.current_window.location.pathname.replace(regex.url_parsers.path_post, '') + resolved.href
    resolved.href = state.current_window.location.protocol + '//' + state.current_window.location.host + resolved.path
  }

  return resolved
}

var get_hls_url = function() {
  if (state.current_window.mustave)
    return state.current_window.mustave

  if (state.current_window.rbnhd)
    return state.current_window.rbnhd

  var hls_url = null

  try {
    var scripts
    scripts = state.current_window.document.querySelectorAll('script')
    scripts = Array.prototype.slice.call(scripts)
    scripts = scripts.map(function(script) {return script.innerText})

    var i, j, regex_test, regex_match, script, matches

    for (i=0; !hls_url && (i < regex.script_parsers.length); i++) {
      if(regex.script_parsers[i] instanceof RegExp) {
        regex_test  = regex.script_parsers[i]
        regex_match = regex.script_parsers[i]
      }
      else if (Array.isArray(regex.script_parsers[i]) && (regex.script_parsers[i].length === 2)) {
        regex_test  = regex.script_parsers[i][0]
        regex_match = regex.script_parsers[i][1]
      }

      for (j=0; !hls_url && (j < scripts.length); j++) {
        script = scripts[j]

        if (regex_test.test(script)) {
          matches = regex_match.exec(script)

          if ((matches !== null) && (matches.length >= 2)) {
            var base64 = matches[1]
            hls_url = atob(base64)
          }
        }
      }
    }
  }
  catch(e) {
    hls_url = null
  }

  return hls_url
}

// ----------------------------------------------------------------------------- only needed for Android-WebMonkey, because the userscript doesn't run in iframes

var tunnel_into_iframe_window = function(iFrame) {
  if (iFrame.contentWindow.document)
    state.current_window = iFrame.contentWindow
}

var redirect_to_iframe = function(resolved) {
  var urlFrame  = resolved.href
  GM_loadFrame(urlFrame, urlFrame)
}

var process_iframe = function() {
  var iFrames
  iFrames = state.current_window.document.querySelectorAll('iframe')
  iFrames = Array.prototype.slice.call(iFrames)

  if (!iFrames.length) return false

  var iFrame, urlFrame, resolved
  for (var i=0; i < iFrames.length; i++) {
    iFrame   = iFrames[i]
    urlFrame = iFrame.getAttribute('src')

    if (urlFrame) {
      resolved = resolve_url(urlFrame)

      if (regex.iframes.follow_path.test(resolved.path)) {
        try {
          tunnel_into_iframe_window(iFrame)
          return true
        }
        catch(e) {
          redirect_to_iframe(resolved)
          return false
        }
      }
    }
  }

  return false
}

// ----------------------------------------------------------------------------- bootstrap: worker

var process_page = function(show_error) {
  if (state.webmonkey)
    while (process_iframe()) {}

  var hls_url = get_hls_url()

  if (hls_url) {
    hls_url = resolve_url(hls_url).href

    var did_redirect = process_hls_url(hls_url)

    if (!did_redirect)
      update_page_DOM(false)
  }
  else if (show_error) {
    update_page_DOM(true)
  }

  return !!hls_url
}

// ----------------------------------------------------------------------------- bootstrap: wait 1 sec after each failed attempt; timeout after 15x failed attempts

var init = function() {
  if (user_options.common.emulate_webmonkey && (unsafeWindow.top !== unsafeWindow.window)) return

  if (state.current_window !== null) return

  if ((typeof GM_getUrl === 'function') && (GM_getUrl() !== unsafeWindow.location.href)) return

  state.current_window = unsafeWindow.window
  state.webmonkey      = (typeof GM_startIntent === 'function')

  var count = 15

  var timer = unsafeWindow.setInterval(
    function() {
      if (count <= 1) unsafeWindow.clearInterval(timer)
      if (count <= 0) return
      if (process_page((count === 1)))
        count = 0
      else
        count--
    },
    1000
  )
}

init()

// -----------------------------------------------------------------------------
