(function () {
  'use strict';

  const CARDS_EL = document.getElementById('cards');
  const COUNT_EL = document.getElementById('count');
  const REFRESH_MS = 1500;
  const lastActiveByTab = new Map();
  const hoveredCards = new Set(); // Track hovered cards

  // Injected into each tab to read media state and thumbnail/cover
  function getMediaInTab() {
    try {
      const videos = document.querySelectorAll('video');
      const audios = document.querySelectorAll('audio');
      const elements = [...videos, ...audios];
      if (elements.length === 0) return { hasMedia: false };

      const media = Array.from(elements).find((el) => !el.paused) || elements[0];
      const isVideo = media.tagName === 'VIDEO';
      const pipSupported = typeof document.pictureInPictureEnabled !== 'undefined';
      const pipActive = document.pictureInPictureElement === media;

      let title = document.title || '';
      let artist = window.location.hostname.replace(/^www\./, '') || '';
      let thumbnail = null;

      if (window.location.hostname.includes('youtube.com') && isVideo) {
        var vMatch = window.location.search.match(/[?&]v=([^&]+)/) || window.location.href.match(/[?&]v=([^&]+)/);
        if (vMatch && vMatch[1]) {
          thumbnail = 'https://i.ytimg.com/vi/' + vMatch[1] + '/hqdefault.jpg';
        }
      }
      if (!thumbnail && media.poster && media.poster.trim()) {
        thumbnail = media.poster;
      }
      if (!thumbnail && 'mediaSession' in navigator && navigator.mediaSession.metadata) {
        var art = navigator.mediaSession.metadata.artwork;
        if (art && art.length > 0 && art[0].src) thumbnail = art[0].src;
      }
      if (!thumbnail) {
        var og = document.querySelector('meta[property="og:image"]');
        if (og && og.content) thumbnail = og.content;
      }
      if (!thumbnail) {
        var tw = document.querySelector('meta[name="twitter:image"]');
        if (tw && tw.content) thumbnail = tw.content;
      }
      if (!thumbnail && isVideo) {
        var ytBg = document.querySelector('.ytp-cued-thumbnail-overlay-image');
        if (ytBg && ytBg.style.backgroundImage) {
          var m = ytBg.style.backgroundImage.match(/url\("?(.+?)"?\)/);
          if (m) thumbnail = m[1];
        }
      }
      if (!thumbnail && window.location.hostname.includes('bandcamp.com')) {
        var bandcampThumb = null;
        var selectors = [
          '#tralbumart img',
          '.tralbumart img',
          '.art img',
          '.popupImage img',
          '.discover-item.playing .art img',
          '.discover-item.playing img[src*="bandcamp"]',
          '.feed-item.playing .art img',
          '.playing .album_art img',
          '.album_art img',
          '[data-item-type].playing .art img',
          '.track_list .playing img',
          '.track_list li.playing .thumb img',
          '.music-grid-item.playing img',
          '.collection-item-detail img',
          '.item-art img',
          '.cover-art img'
        ];
        for (var i = 0; i < selectors.length && !bandcampThumb; i++) {
          var el = document.querySelector(selectors[i]);
          if (el && el.src) bandcampThumb = el.src;
        }
        if (!bandcampThumb) {
          var audioEl = document.querySelector('audio');
          if (audioEl) {
            var container = audioEl.closest('.discover-item, .feed-item, .track_list li, .music-grid-item, [data-item-type], .inline_player, .player-row, [class*="player"]');
            if (container) {
              var img = container.querySelector('img[src*="bandcamp"], img[src*="bc-img"], .art img, img');
              if (img && img.src) bandcampThumb = img.src;
            }
            if (!bandcampThumb) {
              var parent = audioEl.parentElement;
              for (var depth = 0; parent && depth < 12; depth++) {
                var firstImg = parent.querySelector('img[src]');
                if (firstImg && firstImg.src) {
                  bandcampThumb = firstImg.src;
                  break;
                }
                parent = parent.parentElement;
              }
            }
          }
        }
        if (!bandcampThumb) {
          var anyArt = document.querySelector('.discover-item img, .feed-item img, .item-art img, [class*="art"] img');
          if (anyArt && anyArt.src) bandcampThumb = anyArt.src;
        }
        if (bandcampThumb) thumbnail = bandcampThumb;
      }

      if ('mediaSession' in navigator && navigator.mediaSession.metadata) {
        const meta = navigator.mediaSession.metadata;
        if (meta.title) title = meta.title;
        if (meta.artist) artist = meta.artist;
      }
      if (window.location.hostname.includes('bandcamp.com')) {
        var trackTitleEl = document.querySelector('.trackTitle, .title, .track-title, .discover-item.playing .item-title, .feed-item.playing .item-title');
        if (!trackTitleEl) {
          var audioForTitle = document.querySelector('audio');
          if (audioForTitle) {
            var titleContainer = audioForTitle.closest('.discover-item, .feed-item, .track_list li, [data-item-type]');
            if (titleContainer) trackTitleEl = titleContainer.querySelector('.item-title, .trackTitle, .title');
          }
        }
        if (trackTitleEl && trackTitleEl.textContent) title = trackTitleEl.textContent.trim();
        var artistEl = document.querySelector('.artist, .byline, .band, .discover-item.playing .item-artist, .feed-item.playing .item-artist');
        if (!artistEl && document.querySelector('audio')) {
          var artistContainer = document.querySelector('audio').closest('.discover-item, .feed-item, [data-item-type]');
          if (artistContainer) artistEl = artistContainer.querySelector('.item-artist, .artist, .byline');
        }
        if (artistEl && artistEl.textContent) artist = artistEl.textContent.trim();
      }

      return {
        hasMedia: true,
        isPlaying: !media.paused,
        isVideo,
        pipSupported,
        pipActive,
        title: (title || 'Media').substring(0, 60),
        artist: (artist || 'Unknown').substring(0, 50),
        thumbnail,
        currentTime: media.currentTime || 0,
        duration: media.duration || 0,
        volume: media.volume ?? 1,
        muted: media.muted || false,
      };
    } catch (e) {
      return { hasMedia: false };
    }
  }

  // Injected to control media
  function controlMediaInTab(action, options) {
    try {
      const media = document.querySelector('video, audio');
      if (!media) return;

      switch (action) {
        case 'playpause':
          if (media.paused) media.play().catch(() => {});
          else media.pause();
          break;
        case 'seek':
          if (options.percent != null && Number.isFinite(media.duration)) {
            media.currentTime = Math.max(0, Math.min(media.duration, options.percent * media.duration));
          }
          break;
        case 'volume':
          if (options.percent != null) {
            media.volume = Math.max(0, Math.min(1, options.percent));
            media.muted = media.volume === 0;
          }
          break;
        case 'pictureinpicture':
          if (media.tagName !== 'VIDEO' || !document.pictureInPictureEnabled) return;
          if (document.pictureInPictureElement === media) {
            document.exitPictureInPicture().catch(() => {});
          } else {
            media.requestPictureInPicture().catch(() => {});
          }
          break;
        case 'previous': {
          var isBandcamp = window.location.hostname.includes('bandcamp.com');
          if (isBandcamp) {
            var prevSelectors = [
              '.prev', '.prevbutton', '[data-prev]', '.previous-track', 'a.prev', 'button.prev',
              '.inline_player .prev', '.playcontrols .prev', '.prev_item', '[aria-label="Previous track"]',
              '[aria-label="Previous"]', '[title="Previous track"]', '.prev-song', '.prev-track-btn'
            ];
            for (var p = 0; p < prevSelectors.length; p++) {
              var btn = document.querySelector(prevSelectors[p]);
              if (btn && btn.offsetParent !== null && !btn.disabled) {
                btn.click();
                return;
              }
            }
            var allPrev = document.querySelectorAll('button, a, [role="button"]');
            for (var q = 0; q < allPrev.length; q++) {
              var el = allPrev[q];
              var label = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').toLowerCase();
              if (label.indexOf('prev') !== -1) {
                el.click();
                return;
              }
            }
          }
          if ('mediaSession' in navigator) window.dispatchEvent(new Event('previoustrack'));
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaTrackPrevious', bubbles: true }));
          try {
            document.querySelector('.ytp-prev-button, [aria-label="Previous video"]')?.click();
          } catch (_) {}
          break;
        }
        case 'next': {
          var isBandcampNext = window.location.hostname.includes('bandcamp.com');
          if (isBandcampNext) {
            var nextSelectors = [
              '.next', '.nextbutton', '[data-next]', '.next-track', 'a.next', 'button.next',
              '.inline_player .next', '.playcontrols .next', '.next_item', '[aria-label="Next track"]',
              '[aria-label="Next"]', '[title="Next track"]', '.next-song', '.next-track-btn'
            ];
            for (var n = 0; n < nextSelectors.length; n++) {
              var nextBtn = document.querySelector(nextSelectors[n]);
              if (nextBtn && nextBtn.offsetParent !== null && !nextBtn.disabled) {
                nextBtn.click();
                return;
              }
            }
            var allNext = document.querySelectorAll('button, a, [role="button"]');
            for (var r = 0; r < allNext.length; r++) {
              var nextEl = allNext[r];
              var nextLabel = (nextEl.getAttribute('aria-label') || nextEl.getAttribute('title') || nextEl.textContent || '').toLowerCase();
              if (nextLabel.indexOf('next') !== -1) {
                nextEl.click();
                return;
              }
            }
          }
          if ('mediaSession' in navigator) window.dispatchEvent(new Event('nexttrack'));
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaTrackNext', bubbles: true }));
          try {
            document.querySelector('.ytp-next-button, [aria-label="Next video"]')?.click();
          } catch (_) {}
          break;
        }
      }
    } catch (e) {}
  }

  function formatTime(s) {
    if (s == null || !Number.isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  }

  async function fetchMediaTabs() {
    const tabs = await chrome.tabs.query({});
    const now = Date.now();
    const results = [];

    for (const tab of tabs) {
      if (!tab.url || /^(chrome|vivaldi|edge|about):/i.test(tab.url)) continue;
      if (tab.status !== 'complete') continue;

      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: getMediaInTab,
        });
        if (result && result.hasMedia) {
          if (result.isPlaying) lastActiveByTab.set(tab.id, now);
          results.push({
            tabId: tab.id,
            windowId: tab.windowId,
            title: tab.title,
            favIconUrl: tab.favIconUrl,
            media: result,
            lastActive: lastActiveByTab.get(tab.id) || 0,
          });
        }
      } catch (_) {}
    }

    results.sort((a, b) => {
      if (a.media.isPlaying && !b.media.isPlaying) return -1;
      if (!a.media.isPlaying && b.media.isPlaying) return 1;
      return (b.lastActive || 0) - (a.lastActive || 0);
    });
    return results;
  }

  function buildCard(item) {
    const m = item.media;
    const progress = m.duration > 0 ? (m.currentTime / m.duration) * 100 : 0;

    const card = document.createElement('div');
    card.className = 'card' + (m.thumbnail ? ' has-thumb' : '');
    card.dataset.tabId = String(item.tabId);
    card.dataset.windowId = String(item.windowId);

    // Restore hover state if this card was previously hovered
    if (hoveredCards.has(item.tabId)) {
      card.style.transform = 'translateY(-4px) scale(1.02)';
      card.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6)';
    }

    // Add hover event listeners to track state
    card.addEventListener('mouseenter', (e) => {
      // Don't track hover if clicking on a button
      if (e.target.closest('button')) return;
      hoveredCards.add(item.tabId);
    });
    
    card.addEventListener('mouseleave', (e) => {
      // Don't remove hover if clicking on a button
      if (e.target.closest('button')) return;
      hoveredCards.delete(item.tabId);
    });

    // Prevent hover state from interfering with button clicks
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) {
        e.stopPropagation();
      }
    });

    const bg = document.createElement('div');
    bg.className = 'card-bg';
    if (m.thumbnail) bg.style.backgroundImage = 'url(' + m.thumbnail + ')';
    card.appendChild(bg);

    const content = document.createElement('div');
    content.className = 'card-content';

    const favicon = item.favIconUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='8' fill='%23666'/%3E%3C/svg%3E";
    content.innerHTML =
      '<div class="card-source">' +
      '<img class="card-favicon" src="' + favicon + '" alt="">' +
      '<span class="card-tab-title">' + escapeHtml(item.title || 'Tab') + '</span>' +
      (m.isPlaying ? '<span class="card-badge playing">Playing</span>' : '<span class="card-badge">Paused</span>') +
      '</div>' +
      '<div class="card-media-artist">' + escapeHtml(m.artist) + '</div>' +
      '<div class="card-controls">' +
      '<button type="button" class="card-controls-prev" data-action="previous" data-tab="' + item.tabId + '" title="Previous">⏮</button>' +
      '<button type="button" class="btn-play" data-action="playpause" data-tab="' + item.tabId + '" title="Play/Pause">' + (m.isPlaying ? '⏸' : '▶') + '</button>' +
      '<button type="button" data-action="next" data-tab="' + item.tabId + '" title="Next">⏭</button>' +
      '<button type="button" class="card-close" data-action="close" data-tab="' + item.tabId + '" title="Close tab">×</button>' +
      (m.isVideo && m.pipSupported ? '<button type="button" class="btn-pip" data-action="pictureinpicture" data-tab="' + item.tabId + '" title="Picture-in-Picture">' + (m.pipActive ? '⏏' : '⊡') + '</button>' : '') +
      '</div>' +
      '<div class="card-progress"><div class="card-progress-bar" data-action="seek" data-tab="' + item.tabId + '">' +
      '<div class="card-progress-fill" style="width:' + progress + '%"></div></div>' +
      '<div class="card-time"><span class="time-current">' + formatTime(m.currentTime) + '</span><span class="time-total">' + formatTime(m.duration) + '</span></div></div>';

    card.appendChild(content);
    return card;
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function render(items) {
    if (COUNT_EL) COUNT_EL.textContent = String(items.length);

    if (items.length === 0) {
      CARDS_EL.innerHTML =
        '<div class="no-media">No media playing<br><small>Play audio or video in a tab to see it here</small></div>';
      return;
    }

    CARDS_EL.innerHTML = '';
    items.forEach((item) => CARDS_EL.appendChild(buildCard(item)));
    attachCardListeners();
  }

  function attachCardListeners() {
    CARDS_EL.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('[data-action="seek"]') || e.target.closest('.card-progress')) return;
        const tabId = parseInt(card.dataset.tabId, 10);
        const windowId = parseInt(card.dataset.windowId, 10);
        chrome.windows.update(windowId, { focused: true }).then(() => chrome.tabs.update(tabId, { active: true })).then(() => window.close()).catch(() => {});
      });
    });

    CARDS_EL.querySelectorAll('[data-action]').forEach((el) => {
      const action = el.dataset.action;
      const tabId = parseInt(el.dataset.tab, 10);
      if (!action || !tabId) return;

      if (action === 'seek') {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const rect = el.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          chrome.scripting.executeScript({
            target: { tabId },
            func: controlMediaInTab,
            args: ['seek', { percent }],
          }).catch(() => {});
        });

        // Add drag functionality
        let isDragging = false;
        
        el.addEventListener('mousedown', (e) => {
          isDragging = true;
          e.preventDefault();
          e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          
          const rect = el.getBoundingClientRect();
          let percent = (e.clientX - rect.left) / rect.width;
          percent = Math.max(0, Math.min(1, percent)); // Clamp between 0 and 1
          
          chrome.scripting.executeScript({
            target: { tabId },
            func: controlMediaInTab,
            args: ['seek', { percent }],
          }).catch(() => {});
        });
        
        document.addEventListener('mouseup', () => {
          isDragging = false;
        });
        
        return;
      }

      if (action === 'playpause' || action === 'previous' || action === 'next' || action === 'pictureinpicture') {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          chrome.scripting.executeScript({
            target: { tabId },
            func: controlMediaInTab,
            args: [action, {}],
          }).then(() => setTimeout(refresh, 500)).catch(() => {}); // Increased delay
        });
      }

      if (action === 'close') {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          chrome.tabs.remove(tabId).then(() => setTimeout(refresh, 300)).catch(() => {});
        });
      }
    });
  }

  async function refresh() {
    const items = await fetchMediaTabs();
    render(items);
  }

  document.addEventListener('DOMContentLoaded', () => {
    refresh();
    setInterval(refresh, REFRESH_MS);
  });
})();
