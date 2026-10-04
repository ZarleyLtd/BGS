// In-page confirm dialog — avoids native "this site says…" browser prompts.

const ConfirmDialog = {
  _el: null,
  _onKey: null,

  /**
   * @param {{
   *   message?: string,
   *   previewUrl?: string,
   *   confirmLabel?: string,
   *   cancelLabel?: string,
   *   danger?: boolean,
   *   onConfirm?: () => void,
   *   onCancel?: () => void
   * }} opts
   */
  show: function(opts) {
    opts = opts || {};
    this.close();

    const overlay = document.createElement("div");
    overlay.className = "gallery-confirm" + (opts.danger ? " gallery-confirm--danger" : "");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", opts.message || "Please confirm");

    let preview = "";
    if (opts.previewUrl) {
      preview = "<div class=\"gallery-confirm__preview\"><img src=\"" +
        String(opts.previewUrl).replace(/&/g, "&amp;").replace(/"/g, "&quot;") +
        "\" alt=\"Selected photo\" /></div>";
    }

    overlay.innerHTML =
      "<div class=\"gallery-confirm__box\">" +
        preview +
        "<p class=\"gallery-confirm__message\">" + this._escape(opts.message || "Are you sure?") + "</p>" +
        "<div class=\"gallery-confirm__actions\">" +
          "<button type=\"button\" class=\"gallery-confirm__cancel\">" +
            this._escape(opts.cancelLabel || "Cancel") +
          "</button>" +
          "<button type=\"button\" class=\"gallery-confirm__ok\">" +
            this._escape(opts.confirmLabel || "OK") +
          "</button>" +
        "</div>" +
      "</div>";

    const self = this;
    const box = overlay.querySelector(".gallery-confirm__box");
    const cancelBtn = overlay.querySelector(".gallery-confirm__cancel");
    const okBtn = overlay.querySelector(".gallery-confirm__ok");

    function finish(confirmed) {
      self.close();
      if (confirmed) {
        if (typeof opts.onConfirm === "function") opts.onConfirm();
      } else if (typeof opts.onCancel === "function") {
        opts.onCancel();
      }
    }

    cancelBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      finish(false);
    });
    okBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      finish(true);
    });
    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) finish(false);
    });
    box.addEventListener("click", function(e) {
      e.stopPropagation();
    });

    this._onKey = function(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      }
    };
    document.addEventListener("keydown", this._onKey, true);

    document.body.appendChild(overlay);
    this._el = overlay;
    (opts.danger ? cancelBtn : okBtn).focus();
  },

  close: function() {
    if (this._onKey) {
      document.removeEventListener("keydown", this._onKey, true);
      this._onKey = null;
    }
    if (this._el && this._el.parentNode) {
      this._el.parentNode.removeChild(this._el);
    }
    this._el = null;
  },

  _escape: function(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  },
};
