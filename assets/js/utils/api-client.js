// API Client — Supabase Edge Function bgs-api (JSON envelope: { success, ... }).

const ApiClient = {
  /**
   * @param {string} action
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  post: function(action, data) {
    return new Promise((resolve, reject) => {
      const apiUrl = typeof AppConfig !== "undefined" ? AppConfig.apiUrl : "";

      if (!apiUrl) {
        reject(new Error("API URL not configured. Set AppConfig.apiUrl in assets/js/config/app-config.js"));
        return;
      }

      const requestData = {
        action: action,
        data: data,
      };

      const formData = new URLSearchParams();
      formData.append("data", JSON.stringify(requestData));

      fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
        redirect: "follow",
      })
        .then((response) => {
          if (response.status === 404) {
            throw new Error("404_NOT_FOUND");
          }
          return response.text().then((text) => {
            if (!text && (response.ok || response.status === 0)) {
              return { success: true, message: "Request completed" };
            }
            try {
              return JSON.parse(text);
            } catch (e) {
              if (text.includes("<html") || text.includes("<!DOCTYPE")) {
                throw new Error("Server returned HTML instead of JSON. Check bgs-api deployment.");
              }
              throw new Error(`Server response: ${text.substring(0, 200)}`);
            }
          });
        })
        .then((result) => {
          if (result && result.success) {
            resolve(result);
          } else if (result && result.error) {
            const error = new Error(result.error);
            if (result.debug) {
              error.debug = result.debug;
              error.response = result;
            }
            reject(error);
          } else {
            reject(new Error("Unknown error from server"));
          }
        })
        .catch((error) => {
          if (error.message === "404_NOT_FOUND") {
            reject(
              new Error(
                "404 Not Found: bgs-api URL may be wrong. Deploy supabase/functions/bgs-api and set AppConfig.apiUrl.",
              ),
            );
            return;
          }
          if (
            error.message.includes("Failed to fetch") ||
            error.message.includes("NetworkError") ||
            error.name === "TypeError" ||
            error.message.includes("CORS")
          ) {
            reject(new Error("Network/CORS error: could not reach bgs-api. Check AppConfig.apiUrl and deployment."));
          } else {
            reject(error);
          }
        });
    });
  },

  /**
   * @param {Object} params - query params including action
   * @returns {Promise<Object>}
   */
  get: function(params) {
    return new Promise((resolve, reject) => {
      const apiUrl = typeof AppConfig !== "undefined" ? AppConfig.apiUrl : "";

      if (!apiUrl) {
        reject(new Error("API URL not configured. Set AppConfig.apiUrl in assets/js/config/app-config.js"));
        return;
      }

      const queryString = new URLSearchParams(params).toString();
      const url = `${apiUrl}?${queryString}`;

      fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow",
      })
        .then((response) => {
          if (response.status === 404) {
            throw new Error("404_NOT_FOUND");
          }
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return response.json();
          }
          return response.text().then((text) => {
            try {
              return JSON.parse(text);
            } catch (e) {
              if (response.status === 0 || response.ok) {
                try {
                  return JSON.parse(text);
                } catch (e2) {
                  throw new Error("Invalid response format from server");
                }
              }
              throw new Error(`Server error: ${text.substring(0, 100)}`);
            }
          });
        })
        .then((result) => {
          if (result && result.success) {
            resolve(result);
          } else if (result && result.error) {
            reject(new Error(result.error));
          } else {
            reject(new Error("Unknown error from server"));
          }
        })
        .catch((error) => {
          console.error("API request error:", error);
          if (error.message === "404_NOT_FOUND") {
            reject(new Error("404 Not Found: check AppConfig.apiUrl (bgs-api deployment)."));
          } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
            reject(new Error("Network error: could not connect to bgs-api."));
          } else {
            reject(error);
          }
        });
    });
  },
};
