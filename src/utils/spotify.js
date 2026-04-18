const yts = require('yt-search');

// Format seconds to MM:SS
function formatSec(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Search YouTube for top tracks of an artist
async function searchArtistTopTracks(query) {
  const result = await yts(query);
  const videos = result.videos.slice(0, 5);
  if (!videos.length) return null;

  return videos.map(v => ({
    name: v.title.substring(0, 80),
    artists: v.author.name,
    duration: formatSec(v.seconds),
    url: v.url,
  }));
}

module.exports = { searchArtistTopTracks };
