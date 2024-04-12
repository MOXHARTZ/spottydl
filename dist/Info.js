"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlaylist = exports.getDataFromPuppeteer = exports.getAlbum = exports.getTrack = void 0;
const https_proxy_agent_1 = require("https-proxy-agent");
const Util_1 = require("./Util");
const axios_1 = __importDefault(require("axios"));
const ytmusic_api_1 = __importDefault(require("ytmusic-api"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const ytm = new ytmusic_api_1.default();
// Private methods
const get_album_playlist = async (playlistId) => {
    // Get the Track ID for every track by scraping from an unlisted Youtube playlist
    let properUrl = `https://m.youtube.com/playlist?list=${playlistId}`;
    let resp = await axios_1.default.get(properUrl);
    // let resp = await axios.get(properUrl, {headers: { 'User-Agent':'Mozilla/5.0 (Windows NT 10.0; rv:100.0) Gecko/20100101 Firefox/100.0'  }})
    // Scrape json inside script tag
    let ytInitialData = JSON.parse(/(?:window\["ytInitialData"\])|(?:ytInitialData) =.*?({.*?});/s.exec(resp.data)?.[1] || '{}');
    let listData = ytInitialData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer
        .contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer;
    return listData.contents;
};
/**
 * Get the Track details of the given Spotify Track URL
 * @param {string} url Track URL ex `https://open.spotify.com/track/...`
 * @returns {Track} <Track> if success, `string` if failed
 */
const getTrack = async (url = '', cookies, localAddress) => {
    try {
        let linkData = (0, Util_1.checkLinkType)(url);
        let properURL = (0, Util_1.getProperURL)(linkData.id, linkData.type);
        const props = {};
        if (localAddress) {
            let agent = new https_proxy_agent_1.HttpsProxyAgent(localAddress);
            props.httpsAgent = agent;
        }
        let sp = await axios_1.default.get(properURL, props);
        let info = /<script id="initial-state" type="text\/plain">(.*?)<\/script>/s.exec(sp.data);
        // Decode the base64 data, then parse as json... info[1] matches the encoded data
        let spData = JSON.parse(Buffer.from(decodeURIComponent(info[1]), 'base64').toString('utf8'));
        // Assign necessary items to a variable
        let spTrk = spData.entities.items[`spotify:${linkData.type}:${linkData.id}`];
        let tags = {
            title: spTrk.name,
            // artist: tempartist,
            artist: spTrk.otherArtists.items.length == 0
                ? spTrk.firstArtist.items[0].profile.name
                : spTrk.firstArtist.items[0].profile.name +
                    ', ' +
                    spTrk.otherArtists.items.map((i) => i?.profile?.name).join(', '),
            // artist: trk.data.entity.artists.map((i: any) => i.name).join(', '),
            // year: spData.data.entity.releaseDate,
            year: `${spTrk.albumOfTrack.date.year}-${spTrk.albumOfTrack.date.month}-${spTrk.albumOfTrack.date.day}`,
            // album: spData.album.name || undefined,
            album: spTrk.albumOfTrack.name,
            id: 'ID',
            // albumCoverURL: spData.data.entity.coverArt.sources[0].url,
            albumCoverURL: spTrk.albumOfTrack.coverArt.sources[0].url,
            //trackNumber: spData.track_number || undefined
            trackNumber: spTrk.trackNumber
        };
        const ytmProps = {};
        if (cookies) {
            ytmProps.cookies = cookies;
        }
        await ytm.initialize(ytmProps);
        let yt_trk = await ytm.searchSongs(`${tags.title} - ${tags.artist}`);
        tags.id = yt_trk[0].videoId;
        return tags;
    }
    catch (err) {
        return `Caught: ${err.name} | ${err.message}`;
    }
};
exports.getTrack = getTrack;
/**
 * Get the Album details of the given Spotify Album URL
 * @param {string} url Album URL ex `https://open.spotify.com/album/...`
 * @returns {Album} <Album> if success, `string` if failed
 */
const getAlbum = async (url = '') => {
    try {
        let linkData = (0, Util_1.checkLinkType)(url);
        let properURL = (0, Util_1.getProperURL)(linkData.id, linkData.type);
        let sp = await axios_1.default.get(properURL);
        let info = /<script id="initial-state" type="text\/plain">(.*?)<\/script>/s.exec(sp.data);
        let spData = JSON.parse(Buffer.from(decodeURIComponent(info[1]), 'base64').toString('utf8'));
        // Assign necessary items to a variable
        let spTrk = spData.entities.items[`spotify:${linkData.type}:${linkData.id}`];
        let tags = {
            name: spTrk.name,
            artist: spTrk.artists.items.map((e) => e.profile.name).join(', '),
            year: `${spTrk.date.year}-${spTrk.date.month}-${spTrk.date.day}`,
            tracks: [],
            albumCoverURL: spTrk.coverArt.sources[0].url
        };
        // Search the album
        await ytm.initialize();
        let alb = await ytm.searchAlbums(`${tags.artist} - ${tags.name}`);
        let yt_tracks = await get_album_playlist(alb[0].playlistId); // Get track ids from youtube
        spTrk.tracks.items.forEach((i, n) => {
            tags.tracks.push({
                title: i.track.name,
                id: yt_tracks[n].playlistVideoRenderer.videoId,
                trackNumber: i.track.trackNumber
            });
        });
        return tags;
    }
    catch (err) {
        return `Caught: ${err.name} | ${err.message}`;
    }
};
exports.getAlbum = getAlbum;
/**
 * Get the Playlist details of the given Spotify Playlist URL
 * @param {string} url Playlist URL ex `https://open.spotify.com/playlist/...`
 * @returns {Playlist} <Playlist> if success, `string` if failed
 */
const Wait = (ms) => new Promise(res => setTimeout(res, ms));
const getDataFromPuppeteer = async (data) => {
    const browser = await puppeteer_1.default.launch({
        headless: false,
        // defaultViewport: {
        //     isMobile: true,
        //     width: 375,
        //     height: 667,
        // }
    });
    const page = await browser.newPage();
    page.setUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.181 Mobile Safari/537.36');
    await page.goto(data);
    // await page.setContent(data);
    let prevHeight = -1;
    let maxScrolls = 100;
    let scrollCount = 0;
    while (scrollCount < maxScrolls) {
        console.log('scrolling', scrollCount);
        // Scroll to the bottom of the page
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        let newHeight = await page.evaluate('document.body.scrollHeight');
        if (newHeight == prevHeight) {
            console.log('break', newHeight, prevHeight);
            break;
        }
        prevHeight = newHeight;
        scrollCount += 1;
    }
    await Wait(1000);
    let sp = await page.content();
    // await browser.close();
    return sp;
};
exports.getDataFromPuppeteer = getDataFromPuppeteer;
const getPlaylist = async (url = '') => {
    try {
        let linkData = (0, Util_1.checkLinkType)(url);
        let properURL = (0, Util_1.getProperURL)(linkData.id, linkData.type);
        let sp = await (0, exports.getDataFromPuppeteer)(properURL);
        let info = /<script id="initial-state" type="text\/plain">(.*?)<\/script>/s.exec(sp);
        // let info: any = /<script id="initial-state" type="text\/plain">(.*?)<\/script>/s.exec(sp.data)
        let spData = JSON.parse(Buffer.from(decodeURIComponent(info[1]), 'base64').toString('utf8'));
        // Assign necessary items to a variable
        let spPlaylist = spData.entities.items[`spotify:${linkData.type}:${linkData.id}`];
        // Initialize YTMusic
        await ytm.initialize();
        let tags = {
            name: spPlaylist.name,
            owner: spPlaylist.ownerV2.data.name,
            description: spPlaylist?.description,
            followerCount: spPlaylist.followers,
            trackCount: spPlaylist.content.totalCount,
            tracks: spPlaylist.content.items.map(async (trk) => {
                let trackTitle = trk.itemV2.data.name;
                let trackArtists = trk.itemV2.data.artists.items.map((i) => i.profile.name).join(', ');
                let yt_trk = await ytm.searchSongs(`${trackTitle} - ${trackArtists}`);
                return {
                    title: trackTitle,
                    artist: trackArtists,
                    // year: Does not exist when scraping
                    album: trk.itemV2.data.albumOfTrack.name,
                    id: yt_trk[0].videoId,
                    albumCoverURL: trk.itemV2.data.albumOfTrack.coverArt.sources[0].url,
                    trackNumber: trk.itemV2.data.trackNumber
                };
            }),
            playlistCoverURL: spPlaylist.images.items[0].sources[0].url
        };
        // Search the tracks from youtube concurrently
        await Promise.all(tags.tracks).then((items) => {
            tags.tracks = items;
        });
        return tags;
    }
    catch (err) {
        return `Caught: ${err.name} | ${err.message}`;
    }
};
exports.getPlaylist = getPlaylist;
