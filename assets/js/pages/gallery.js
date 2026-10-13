// Gallery Page — year albums from the manifest, Latest Uploads from bgs-api.

const GalleryPage = {
  container: null,
  manifest: null,
  latestPhotos: [],

  init: function() {
    this.container = document.getElementById("gallery-app");
    if (!this.container) return;
    this.load();
  },

  load: function() {
    const self = this;
    Promise.all([this.fetchManifest(), this.fetchLatestPhotos()]).then(function(results) {
      self.manifest = results[0];
      self.latestPhotos = results[1];
      self.render();
    }).catch(function() {
      self.onManifestError();
    });
  },

  fetchManifest: function() {
    const url = typeof GalleryConfig !== "undefined"
      ? GalleryConfig.manifestUrl
      : "assets/data/gallery-manifest.json";
    return fetch(url).then(function(r) {
      if (!r.ok) throw new Error("manifest");
      return r.json();
    });
  },

  fetchLatestPhotos: function() {
    if (typeof ApiClient === "undefined") return Promise.resolve([]);
    return ApiClient.get({ action: "listGalleryUploads" }).then(function(result) {
      return Array.isArray(result.photos) ? result.photos : [];
    }).catch(function() {
      return [];
    });
  },

  onManifestError: function() {
    this.container.innerHTML = "<p class=\"msg msg--warning\">Unable to load gallery. Please try again later.</p>";
  },

  getAlbumFromUrl: function() {
    const params = new URLSearchParams(window.location.search);
    return params.get("album") || null;
  },

  isLatestAlbum: function(id) {
    const latestId = (typeof GalleryConfig !== "undefined" && GalleryConfig.latestAlbumId)
      ? GalleryConfig.latestAlbumId
      : "latest";
    return id === latestId;
  },

  latestAlbumName: function() {
    return (typeof GalleryConfig !== "undefined" && GalleryConfig.latestAlbumName)
      ? GalleryConfig.latestAlbumName
      : "Latest Uploads";
  },

  getStaticAlbum: function(id) {
    if (!this.manifest || !this.manifest.albums) return null;
    return this.manifest.albums.find(function(a) { return a.id === id; }) || null;
  },

  buildLatestAlbum: function() {
    return {
      id: (typeof GalleryConfig !== "undefined" && GalleryConfig.latestAlbumId) ? GalleryConfig.latestAlbumId : "latest",
      name: this.latestAlbumName(),
      isLatest: true,
      photos: this.latestPhotos.slice(),
    };
  },

  photosForAlbum: function(album) {
    if (album && album.isLatest) {
      return (album.photos || []).map(function(p) {
        return { id: p.id, url: p.url };
      });
    }
    const albumImageUrl = this.albumImageUrlFn();
    const images = (album && album.images) || [];
    return images.map(function(fn) {
      return { id: null, url: albumImageUrl(album.id, fn) };
    });
  },

  albumImageUrlFn: function() {
    const basePath = (typeof GalleryConfig !== "undefined" && GalleryConfig.basePath)
      ? GalleryConfig.basePath
      : "assets/images/Gallery";
    if (typeof GalleryConfig !== "undefined" && typeof GalleryConfig.albumImageUrl === "function") {
      return GalleryConfig.albumImageUrl.bind(GalleryConfig);
    }
    return function(id, f) {
      return basePath + "/" + encodeURIComponent(id) + "/" + encodeURIComponent(f);
    };
  },

  render: function() {
    const albumId = this.getAlbumFromUrl();
    if (albumId && this.isLatestAlbum(albumId)) {
      this.renderAlbumView(this.buildLatestAlbum());
      return;
    }
    const album = albumId ? this.getStaticAlbum(albumId) : null;
    if (album) {
      this.renderAlbumView(album);
    } else {
      this.renderAlbumList();
    }
  },

  renderToolbar: function() {
    return (
      "<div class=\"gallery-toolbar\">" +
        "<button type=\"button\" class=\"gallery-upload-btn\" id=\"gallery-upload-btn\">" +
          "<span class=\"gallery-upload-btn__label\">Upload Photo</span>" +
        "</button>" +
      "</div>"
    );
  },

  bindUpload: function() {
    const btn = document.getElementById("gallery-upload-btn");
    if (!btn || typeof GalleryUpload === "undefined") return;
    const self = this;
    GalleryUpload.init(btn, {
      onUploaded: function(photo) {
        self.latestPhotos = [photo].concat(self.latestPhotos.filter(function(p) { return p.id !== photo.id; }));
        const latestId = (typeof GalleryConfig !== "undefined" && GalleryConfig.latestAlbumId)
          ? GalleryConfig.latestAlbumId
          : "latest";
        if (!self.isLatestAlbum(self.getAlbumFromUrl())) {
          history.replaceState(null, "", "gallery.html?album=" + encodeURIComponent(latestId));
        }
        self.render();
      },
    });
  },

  renderAlbumList: function() {
    const albums = (this.manifest && this.manifest.albums) || [];
    const albumImageUrl = this.albumImageUrlFn();
    const latest = this.buildLatestAlbum();
    const latestCount = latest.photos.length;
    const latestCover = latestCount ? latest.photos[0].url : "";
    const latestHref = "gallery.html?album=" + encodeURIComponent(latest.id);

    let html = this.renderToolbar();
    html += "<div class=\"gallery-albums\"><div class=\"gallery-albums__grid\">";
    html += this.albumCardHtml(latest.name, latestHref, latestCount, latestCover, true);

    for (let i = 0; i < albums.length; i++) {
      const a = albums[i];
      const coverUrl = albumImageUrl(a.id, a.cover);
      const href = "gallery.html?album=" + encodeURIComponent(a.id);
      const count = (a.images && a.images.length) ? a.images.length : 0;
      html += this.albumCardHtml(a.name, href, count, coverUrl, false);
    }
    html += "</div></div>";

    this.container.innerHTML = html;
    this.initImageLoader();
    this.bindUpload();
  },

  albumCardHtml: function(name, href, count, coverUrl, isLatest) {
    const countLabel = count + " photo" + (count !== 1 ? "s" : "");
    let img = "";
    if (coverUrl) {
      img = "<img src=\"" + escapeAttr(coverUrl) + "\" alt=\"\" loading=\"lazy\" />";
    } else {
      img = "<span class=\"gallery-album-card__placeholder\">No photos yet</span>";
    }
    return (
      "<div class=\"gallery-album-card" + (isLatest ? " gallery-album-card--latest" : "") + "\">" +
        "<a href=\"" + href + "\" class=\"gallery-album-card__link\">" +
          "<span class=\"gallery-album-card__img-wrap\">" + img + "</span>" +
          "<span class=\"gallery-album-card__title\">" + escapeHtml(name) + "</span>" +
          "<span class=\"gallery-album-card__count\">" + countLabel + "</span>" +
        "</a>" +
      "</div>"
    );
  },

  renderAlbumView: function(album) {
    const photos = this.photosForAlbum(album);
    let html = "<div class=\"gallery-album-view\">";
    html += "<nav class=\"gallery-breadcrumb\"><a href=\"gallery.html\">Gallery</a> <span aria-hidden=\"true\">›</span> <span>" + escapeHtml(album.name) + "</span></nav>";
    if (album.isLatest) html += this.renderToolbar();
    if (photos.length === 0) {
      html += "<p class=\"gallery-empty\">No photos in this album yet.</p>";
    } else {
      html += "<div class=\"gallery-wrapper--wide\"><div class=\"gallery gallery--photos\" data-columns=\"4\" role=\"list\">";
      for (let i = 0; i < photos.length; i++) {
        const src = photos[i].url;
        html += "<figure class=\"gallery__item\" role=\"listitem\">";
        html += "<a href=\"" + escapeAttr(src) + "\" data-index=\"" + i + "\" class=\"gallery__item-link\" data-gallery-lightbox>";
        html += "<img src=\"" + escapeAttr(src) + "\" alt=\"Photo " + (i + 1) + "\" loading=\"lazy\" />";
        html += "</a></figure>";
      }
      html += "</div></div>";
    }
    html += "</div>";

    this.container.innerHTML = html;
    this.initImageLoader();
    if (album.isLatest) this.bindUpload();
    if (photos.length) this.attachLightbox(photos, { allowDelete: !!album.isLatest });
  },

  initImageLoader: function() {
    if (typeof ImageLoader !== "undefined" && typeof ImageLoader.init === "function") {
      ImageLoader.init();
    }
  },

  attachLightbox: function(photos, opts) {
    const links = this.container.querySelectorAll("[data-gallery-lightbox]");
    if (links.length === 0) return;
    const allowDelete = !!(opts && opts.allowDelete);
    const self = this;

    for (let i = 0; i < links.length; i++) {
      links[i].addEventListener("click", function(e) {
        e.preventDefault();
        openLightbox(parseInt(this.getAttribute("data-index"), 10));
      });
    }

    function openLightbox(index) {
      const existing = document.getElementById("gallery-lightbox");
      if (existing) existing.remove();

      let currentIndex = Math.max(0, Math.min(index, photos.length - 1));
      let animating = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let dragStartTime = 0;
      let dragging = false;
      let lastDx = 0;
      let scale = 1;
      let panX = 0;
      let panY = 0;
      let panOriginX = 0;
      let panOriginY = 0;
      let gesture = null;
      let pinch = null;
      let lastTap = null;
      let blockDblClickUntil = 0;
      const pointers = new Map();
      const MIN_SCALE = 1;
      const MAX_SCALE = 4;
      const DOUBLE_TAP_SCALE = 2;

      const overlay = document.createElement("div");
      overlay.id = "gallery-lightbox";
      overlay.className = "gallery-lightbox";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.innerHTML =
        "<button type=\"button\" class=\"gallery-lightbox__close\" aria-label=\"Close\">×</button>" +
        "<button type=\"button\" class=\"gallery-lightbox__prev\" aria-label=\"Previous\">‹</button>" +
        "<button type=\"button\" class=\"gallery-lightbox__next\" aria-label=\"Next\">›</button>" +
        "<div class=\"gallery-lightbox__viewport\">" +
          "<div class=\"gallery-lightbox__track\">" +
            "<div class=\"gallery-lightbox__slide\" data-slot=\"prev\"><img alt=\"\" /></div>" +
            "<div class=\"gallery-lightbox__slide\" data-slot=\"current\"><img alt=\"\" /></div>" +
            "<div class=\"gallery-lightbox__slide\" data-slot=\"next\"><img alt=\"\" /></div>" +
          "</div>" +
        "</div>" +
        "<span class=\"gallery-lightbox__counter\"></span>" +
        (allowDelete ? "<button type=\"button\" class=\"gallery-lightbox__delete\" hidden>Delete</button>" : "");

      const track = overlay.querySelector(".gallery-lightbox__track");
      const viewport = overlay.querySelector(".gallery-lightbox__viewport");
      const prevSlide = overlay.querySelector("[data-slot=\"prev\"]");
      const curSlide = overlay.querySelector("[data-slot=\"current\"]");
      const nextSlide = overlay.querySelector("[data-slot=\"next\"]");
      const prevBtn = overlay.querySelector(".gallery-lightbox__prev");
      const nextBtn = overlay.querySelector(".gallery-lightbox__next");
      const closeBtn = overlay.querySelector(".gallery-lightbox__close");
      const counter = overlay.querySelector(".gallery-lightbox__counter");
      const deleteBtn = overlay.querySelector(".gallery-lightbox__delete");

      function photoAt(i) {
        return i >= 0 && i < photos.length ? photos[i] : null;
      }

      function setSlide(slide, i) {
        const photo = photoAt(i);
        const img = slide.querySelector("img");
        if (!photo) {
          img.removeAttribute("src");
          slide.classList.add("is-empty");
          return;
        }
        slide.classList.remove("is-empty");
        if (img.getAttribute("src") !== photo.url) img.src = photo.url;
      }

      function resetTrack(withTransition) {
        track.style.transition = withTransition ? "transform 0.28s ease" : "none";
        track.style.transform = "translateX(-33.333%)";
      }

      function layoutSlides() {
        setSlide(prevSlide, currentIndex - 1);
        setSlide(curSlide, currentIndex);
        setSlide(nextSlide, currentIndex + 1);
        resetTrack(false);
      }

      function updateChrome() {
        overlay.setAttribute("aria-label", "Photo " + (currentIndex + 1) + " of " + photos.length);
        if (counter) counter.textContent = (currentIndex + 1) + " / " + photos.length;
        const photo = photoAt(currentIndex);
        const canDelete = allowDelete && photo && typeof GalleryUpload !== "undefined" && GalleryUpload.isOwned(photo.id);
        if (deleteBtn) deleteBtn.hidden = !canDelete;
      }

      function currentImg() {
        return curSlide.querySelector("img");
      }

      function clampScale(value) {
        return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
      }

      function isZoomed() {
        return scale > 1.01;
      }

      function applyZoom(animated) {
        const img = currentImg();
        if (!img) return;
        img.style.transition = animated ? "transform 0.22s ease" : "none";
        if (!isZoomed()) {
          scale = 1;
          panX = 0;
          panY = 0;
          img.style.transform = "";
          overlay.classList.remove("is-zoomed");
          return;
        }
        img.style.transform = "translate(" + panX.toFixed(2) + "px, " + panY.toFixed(2) + "px) scale(" + scale.toFixed(4) + ")";
        overlay.classList.add("is-zoomed");
      }

      function clampPan() {
        const img = currentImg();
        const baseW = img ? img.offsetWidth : 0;
        const baseH = img ? img.offsetHeight : 0;
        if (!baseW || !baseH || scale <= 1) {
          panX = 0;
          panY = 0;
          return;
        }
        const maxX = Math.max(0, (baseW * scale - viewport.clientWidth) / 2);
        const maxY = Math.max(0, (baseH * scale - viewport.clientHeight) / 2);
        panX = Math.min(maxX, Math.max(-maxX, panX));
        panY = Math.min(maxY, Math.max(-maxY, panY));
      }

      function resetZoom(animated) {
        scale = 1;
        panX = 0;
        panY = 0;
        applyZoom(!!animated);
      }

      function zoomToPoint(newScale, clientX, clientY, animated) {
        const img = currentImg();
        if (!img) return;
        const rect = img.getBoundingClientRect();
        const visualCenterX = rect.left + rect.width / 2;
        const visualCenterY = rect.top + rect.height / 2;
        const next = clampScale(newScale);
        const safe = scale || 1;
        panX = panX + (clientX - visualCenterX) * (1 - next / safe);
        panY = panY + (clientY - visualCenterY) * (1 - next / safe);
        scale = next;
        clampPan();
        applyZoom(!!animated);
      }

      function applyPinchFrame(prevX, prevY, nextX, nextY, newScale) {
        const img = currentImg();
        if (!img) return;
        const rect = img.getBoundingClientRect();
        const visualCenterX = rect.left + rect.width / 2;
        const visualCenterY = rect.top + rect.height / 2;
        const next = clampScale(newScale);
        const safe = scale || 1;
        panX = nextX - visualCenterX + panX - ((prevX - visualCenterX) / safe) * next;
        panY = nextY - visualCenterY + panY - ((prevY - visualCenterY) / safe) * next;
        scale = next;
        clampPan();
        applyZoom(false);
      }

      function toggleDoubleTapZoom(clientX, clientY) {
        if (isZoomed()) resetZoom(true);
        else zoomToPoint(DOUBLE_TAP_SCALE, clientX, clientY, true);
      }

      function registerTap(clientX, clientY) {
        const now = Date.now();
        if (lastTap && (now - lastTap.time) < 300 && Math.hypot(clientX - lastTap.x, clientY - lastTap.y) < 28) {
          lastTap = null;
          blockDblClickUntil = now + 500;
          toggleDoubleTapZoom(clientX, clientY);
          return;
        }
        lastTap = { time: now, x: clientX, y: clientY };
      }

      function pointerValues() {
        return Array.from(pointers.values());
      }

      function goTo(direction) {
        if (animating) return;
        const nextIndex = currentIndex + direction;
        if (nextIndex < 0 || nextIndex >= photos.length) {
          if (!isZoomed()) resetTrack(true);
          return;
        }
        gesture = null;
        dragging = false;
        overlay.classList.remove("is-panning");
        if (isZoomed()) resetZoom(false);
        animating = true;
        track.style.transition = "transform 0.28s ease";
        track.style.transform = direction > 0 ? "translateX(-66.666%)" : "translateX(0%)";
        var settled = false;
        function finish() {
          if (settled) return;
          settled = true;
          track.removeEventListener("transitionend", onEnd);
          currentIndex = nextIndex;
          layoutSlides();
          updateChrome();
          animating = false;
        }
        function onEnd(e) {
          if (e && e.target !== track) return;
          finish();
        }
        track.addEventListener("transitionend", onEnd);
        setTimeout(finish, 350);
      }

      function close() {
        overlay.remove();
        document.documentElement.classList.remove("no-scroll");
        document.body.classList.remove("no-scroll");
        document.removeEventListener("keydown", onKey);
      }

      function onKey(e) {
        if (e.key === "Escape") { close(); return; }
        if (e.key === "ArrowLeft") { e.preventDefault(); goTo(-1); }
        if (e.key === "ArrowRight") { e.preventDefault(); goTo(1); }
      }

      function applyDrag(dx) {
        const atStart = currentIndex === 0 && dx > 0;
        const atEnd = currentIndex === photos.length - 1 && dx < 0;
        const used = (atStart || atEnd) ? dx * 0.35 : dx;
        track.style.transition = "none";
        track.style.transform = "translateX(calc(-33.333% + " + used + "px))";
        lastDx = used;
      }

      function onPointerDown(e) {
        if (animating) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (e.pointerType !== "mouse") e.preventDefault();
        try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }

        if (pointers.size >= 2) {
          const pts = pointerValues();
          gesture = "pinch";
          dragging = false;
          resetTrack(false);
          pinch = {
            lastX: (pts[0].x + pts[1].x) / 2,
            lastY: (pts[0].y + pts[1].y) / 2,
            lastDist: Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)),
          };
          overlay.classList.add("is-panning");
          return;
        }

        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartTime = Date.now();
        lastDx = 0;
        panOriginX = panX;
        panOriginY = panY;
        if (isZoomed()) {
          gesture = "pan";
          dragging = true;
          overlay.classList.add("is-panning");
        } else if (e.pointerType !== "mouse") {
          gesture = "swipe";
          dragging = true;
        } else {
          gesture = null;
          dragging = false;
        }
      }

      function onPointerMove(e) {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (gesture === "pinch" && pointers.size >= 2 && pinch) {
          e.preventDefault();
          const pts = pointerValues();
          const dist = Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
          const midX = (pts[0].x + pts[1].x) / 2;
          const midY = (pts[0].y + pts[1].y) / 2;
          const newScale = clampScale(scale * (dist / pinch.lastDist));
          applyPinchFrame(pinch.lastX, pinch.lastY, midX, midY, newScale);
          pinch.lastDist = dist;
          pinch.lastX = midX;
          pinch.lastY = midY;
          return;
        }

        if (!dragging) return;
        if (gesture === "pan") {
          e.preventDefault();
          panX = panOriginX + (e.clientX - dragStartX);
          panY = panOriginY + (e.clientY - dragStartY);
          clampPan();
          applyZoom(false);
          return;
        }
        if (gesture === "swipe") applyDrag(e.clientX - dragStartX);
      }

      function onPointerEnd(e) {
        if (!pointers.has(e.pointerId)) return;
        pointers.delete(e.pointerId);

        if (gesture === "pinch") {
          if (pointers.size >= 2) return;
          pinch = null;
          overlay.classList.remove("is-panning");
          if (scale < 1.05) resetZoom(true);
          else {
            clampPan();
            applyZoom(false);
          }
          if (pointers.size === 1 && isZoomed()) {
            const rest = pointerValues()[0];
            dragStartX = rest.x;
            dragStartY = rest.y;
            panOriginX = panX;
            panOriginY = panY;
            gesture = "pan";
            dragging = true;
            overlay.classList.add("is-panning");
          } else {
            gesture = null;
            dragging = false;
          }
          return;
        }

        const wasDragging = dragging;
        const wasGesture = gesture;
        dragging = false;
        gesture = null;
        overlay.classList.remove("is-panning");
        if (!wasDragging) return;

        if (wasGesture === "pan") {
          const panDx = e.clientX - dragStartX;
          const panDy = e.clientY - dragStartY;
          if (e.type !== "pointercancel" && e.pointerType !== "mouse" && Math.abs(panDx) < 15 && Math.abs(panDy) < 15) {
            registerTap(e.clientX, e.clientY);
          }
          return;
        }

        if (wasGesture === "swipe") {
          if (e.type === "pointercancel") {
            resetTrack(true);
            return;
          }
          const dx = e.clientX - dragStartX;
          const dy = e.clientY - dragStartY;
          const dt = Math.max(1, Date.now() - dragStartTime);
          const velocity = dx / dt;
          const threshold = Math.min(80, (viewport.clientWidth || 300) * 0.18);
          const tap = Math.abs(dx) < 15 && Math.abs(dy) < 15;
          if (tap) {
            resetTrack(false);
            if (e.pointerType !== "mouse") registerTap(e.clientX, e.clientY);
          } else if (dx < -threshold || velocity < -0.4) {
            goTo(1);
          } else if (dx > threshold || velocity > 0.4) {
            goTo(-1);
          } else {
            resetTrack(true);
          }
        }
      }

      viewport.addEventListener("pointerdown", onPointerDown);
      viewport.addEventListener("pointermove", onPointerMove);
      viewport.addEventListener("pointerup", onPointerEnd);
      viewport.addEventListener("pointercancel", onPointerEnd);
      viewport.addEventListener("touchmove", function(e) {
        if (gesture) e.preventDefault();
      }, { passive: false });

      overlay.addEventListener("dblclick", function(e) {
        if (Date.now() < blockDblClickUntil) return;
        if (e.target.closest && e.target.closest("button")) return;
        if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
        e.preventDefault();
        toggleDoubleTapZoom(e.clientX, e.clientY);
      });

      overlay.addEventListener("wheel", function(e) {
        e.preventDefault();
        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 16;
        else if (e.deltaMode === 2) delta *= viewport.clientHeight || 800;
        const next = clampScale(scale * Math.exp(-delta * 0.0016));
        if (next <= 1.01) {
          if (isZoomed()) resetZoom(false);
          return;
        }
        zoomToPoint(next, e.clientX, e.clientY, false);
      }, { passive: false });

      overlay.addEventListener("click", function(e) {
        if (e.target === overlay) close();
      });
      prevBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        e.preventDefault();
        goTo(-1);
      });
      nextBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        e.preventDefault();
        goTo(1);
      });
      closeBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        close();
      });
      if (deleteBtn) {
        deleteBtn.addEventListener("click", function(e) {
          e.stopPropagation();
          const photo = photoAt(currentIndex);
          if (!photo || !photo.id) return;
          if (typeof ConfirmDialog === "undefined") return;
          ConfirmDialog.show({
            message: "Delete this photo? This cannot be undone.",
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            danger: true,
            onConfirm: function() {
              if (typeof ApiClient === "undefined" || typeof GalleryUpload === "undefined") return;
              deleteBtn.disabled = true;
              ApiClient.post("deleteGalleryPhoto", {
                id: photo.id,
                uploaderToken: GalleryUpload.getUploaderToken(),
              }).then(function() {
                GalleryUpload.removeOwnedId(photo.id);
                self.latestPhotos = self.latestPhotos.filter(function(p) { return p.id !== photo.id; });
                close();
                self.render();
              }).catch(function(err) {
                deleteBtn.disabled = false;
                if (typeof BriefMessage !== "undefined") {
                  BriefMessage.show((err && err.message) || "Could not delete this photo.", deleteBtn, { durationMs: 2200 });
                }
              });
            },
          });
        });
      }

      layoutSlides();
      updateChrome();
      document.addEventListener("keydown", onKey);
      document.documentElement.classList.add("no-scroll");
      document.body.classList.add("no-scroll");
      document.body.appendChild(overlay);
    }
  },
};

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
