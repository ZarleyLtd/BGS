// Gallery photo upload — file picker, ~70KB compress, session-token ownership.

const GalleryUpload = {
  SESSION_TOKEN_KEY: "bgs_gallery_uploader_token",
  OWNED_IDS_KEY: "bgs_gallery_owned_ids",

  _buttonEl: null,
  _inputEl: null,
  _onUploaded: null,

  getUploaderToken: function() {
    try {
      let token = sessionStorage.getItem(this.SESSION_TOKEN_KEY);
      if (!token) {
        token = (typeof crypto !== "undefined" && crypto.randomUUID)
          ? crypto.randomUUID()
          : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
        sessionStorage.setItem(this.SESSION_TOKEN_KEY, token);
      }
      return token;
    } catch (e) {
      return "session-fallback";
    }
  },

  getOwnedIds: function() {
    try {
      const raw = sessionStorage.getItem(this.OWNED_IDS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  addOwnedId: function(id) {
    if (!id) return;
    const ids = this.getOwnedIds();
    if (ids.indexOf(id) === -1) ids.push(id);
    try {
      sessionStorage.setItem(this.OWNED_IDS_KEY, JSON.stringify(ids));
    } catch (e) { /* ignore quota */ }
  },

  removeOwnedId: function(id) {
    const ids = this.getOwnedIds().filter(function(x) { return x !== id; });
    try {
      sessionStorage.setItem(this.OWNED_IDS_KEY, JSON.stringify(ids));
    } catch (e) { /* ignore quota */ }
  },

  isOwned: function(id) {
    return !!id && this.getOwnedIds().indexOf(id) !== -1;
  },

  /**
   * @param {HTMLElement} buttonEl
   * @param {{ onUploaded: (photo: { id: string, url: string, uploadedAt?: string }) => void }} callbacks
   */
  init: function(buttonEl, callbacks) {
    if (!buttonEl) return;
    this._buttonEl = buttonEl;
    this._onUploaded = callbacks && callbacks.onUploaded;
    this.getUploaderToken();

    if (!this._inputEl) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.className = "gallery-upload-input";
      input.setAttribute("aria-hidden", "true");
      input.tabIndex = -1;
      input.addEventListener("change", this._onFilePicked.bind(this));
      document.body.appendChild(input);
      this._inputEl = input;
    }

    buttonEl.addEventListener("click", this._onButtonClick.bind(this));
  },

  setBusy: function(isBusy) {
    if (!this._buttonEl) return;
    this._buttonEl.disabled = !!isBusy;
    this._buttonEl.setAttribute("aria-busy", isBusy ? "true" : "false");
    const label = this._buttonEl.querySelector(".gallery-upload-btn__label");
    if (label) label.textContent = isBusy ? "Uploading…" : "Upload Photo";
  },

  _onButtonClick: function() {
    if (!this._inputEl || this._buttonEl.disabled) return;
    this._inputEl.value = "";
    this._inputEl.click();
  },

  _onFilePicked: function(e) {
    const file = e.target && e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//i.test(file.type || "")) {
      this._notify("Please choose a photo.");
      return;
    }
    this._uploadFile(file);
  },

  _notify: function(text) {
    if (typeof BriefMessage !== "undefined" && this._buttonEl) {
      BriefMessage.show(text, this._buttonEl, { durationMs: 1800 });
      return;
    }
    window.alert(text);
  },

  _uploadFile: function(file) {
    const self = this;
    if (typeof ImageCompress === "undefined" || typeof ApiClient === "undefined") {
      this._notify("Upload is not available right now.");
      return;
    }
    this.setBusy(true);
    ImageCompress.compressToTarget(file)
      .then(function(compressed) {
        if (compressed.byteSize > 100 * 1024) {
          throw new Error("Photo is still too large after compression. Try another photo.");
        }
        return ApiClient.post("uploadGalleryPhoto", {
          base64: compressed.base64,
          mimeType: compressed.mimeType || "image/jpeg",
          uploaderToken: self.getUploaderToken(),
          originalFilename: file.name || "",
        });
      })
      .then(function(result) {
        const photo = result && result.photo;
        if (!photo || !photo.id || !photo.url) {
          throw new Error("Upload did not return a photo.");
        }
        self.addOwnedId(photo.id);
        self.setBusy(false);
        self._notify("Photo uploaded");
        if (typeof self._onUploaded === "function") self._onUploaded(photo);
      })
      .catch(function(err) {
        self.setBusy(false);
        self._notify((err && err.message) || "Upload failed. Please try again.");
      });
  },
};
