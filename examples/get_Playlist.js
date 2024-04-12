const spottyDL = require('../');
const playlist = "https://open.spotify.com/playlist/37i9dQZF1E38wVOX2C3p1a?si=o4sOyX3nSBWZVf05wH5MmQ";
const playlist1 = "https://open.spotify.com/playlist/7n5qFvScLgk29ZLdhu3hCz?si=fI8n84zmREeTq5yHoTezsQ";
const playlist2 = "https://open.spotify.com/playlist/37i9dQZF1DWXMg4uP5o3dm?si=e8483d25b0dd4fe3"

    ; (async () => {
        let data = await spottyDL.getPlaylist(playlist2);
        console.log(spottyDL.checkType(data))
        console.log(data)
    })()
