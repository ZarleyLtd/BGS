// Gallery Configuration
// Year albums = assets/images/Gallery/{year} and General (manifest).
// Latest Uploads = live Supabase holding album (bgs-api listGalleryUploads).

const GalleryConfig = {
  basePath: "assets/images/Gallery",
  manifestUrl: "assets/data/gallery-manifest.json",
  latestAlbumId: "latest",
  latestAlbumName: "Latest Uploads",

  albumImageUrl: function(albumId, filename) {
    return this.basePath + "/" + encodeURIComponent(albumId) + "/" + encodeURIComponent(filename);
  },
};
