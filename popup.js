// popup.js
document.addEventListener("DOMContentLoaded", function () {
  const urlElement = document.getElementById("url");
  const closeButton = document.getElementById("closeButton");
  const DownloadMP3Button = document.getElementById("DownloadMP3Button");
  const DownloadCSVButton = document.getElementById("DownloadCSVButton");
  const SeePlaylistButton = document.getElementById("SeePlaylistButton");

  // Get the current URL and display it in the popup
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0].url;
    urlElement.textContent = url;
  });

  // Close button
  closeButton.addEventListener("click", () => {
    window.close();
  });

  // Download CSV button
  DownloadCSVButton.addEventListener("click", async () => {
    const playlistData = await getPlaylistDetails();
    savePlaylistToCSV(playlistData.playlistName, playlistData.tracks);
  });

  // Download MP3 button
  DownloadMP3Button.addEventListener("click", async () => {
    const playlistData = await getPlaylistDetails();
    console.log("playlistData:")
    console.log(playlistData);

    console.log("JSON:")
    console.log(JSON.stringify(playlistData));
  });

  // See Playlist button
  SeePlaylistButton.addEventListener("click", async () => {
    const playlistData = await getPlaylistDetails();

    chrome.storage.local.set({ 'playlistData': playlistData }, function () {
      console.log('Playlist data saved');
      chrome.tabs.create({ url: 'viewingportal.html' });
    });
  });


});

async function savePlaylistToCSV(playlistName, playlistDetails) {
  try {
    if (!playlistDetails) {
      console.error('Failed to get playlist details');
      return;
    }

    const csvContent = convertToCSV(playlistDetails);
    const blob = new Blob([csvContent], { type: 'text/csv' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${playlistName}_playlist.csv`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error while saving playlist to CSV:', error);
  }
}


// Convert playlist details to CSV format
function convertToCSV(playlistDetails) {
  const headers = Object.keys(playlistDetails[0]).join(',');

  const rows = playlistDetails.map(track => {
    return Object.values(track).map(value => `"${value}"`).join(',');
  });

  return `${headers}\n${rows.join('\n')}`;
}

async function getAccessToken(clientId, clientSecret) {
  // Spotify API token endpoint
  const tokenEndpoint = 'https://accounts.spotify.com/api/token';

  // Base64 encode the client ID and client secret
  const credentials = btoa(`${clientId}:${clientSecret}`);

  // Set up the request headers
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Basic ${credentials}`,
  };

  // Set up the request body
  const requestBody = new URLSearchParams({
    'grant_type': 'client_credentials'
  });

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: headers,
      body: requestBody.toString(),
    });

    if (response.ok) {
      const data = await response.json();
      const accessToken = data.access_token;
      return accessToken;
    } else {
      console.error('Failed to get access token:', response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Error while requesting access token:', error);
    return null;
  }
}

async function getPlaylistDetails() {
  const urlElement = document.getElementById('url');
  try {
    // Get the URL from the urlElement
    const playlistUrl = urlElement.textContent;

    // Extract the playlist ID from the URL if provided
    const playlistIdMatch = playlistUrl.match(/playlist\/(\w+)/);
    if (!playlistIdMatch) {
      throw new Error('Invalid playlist URL');
    }
    const playlistId = playlistIdMatch[1];

    // Define client ID and secret
    const clientId = '6c07df458f764d6eba746f4f3d282efc';
    const clientSecret = '13e852c924834ab9a87c2e4d9f4c3215';

    // Get the access token
    const accessToken = await getAccessToken(clientId, clientSecret);
    if (!accessToken) {
      throw new Error('Failed to get access token');
    }

    // Spotify API endpoint for getting playlist details
    const playlistEndpoint = `https://api.spotify.com/v1/playlists/${playlistId}`;

    // Set up headers with the access token
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
    };

    // Fetch the playlist details
    const response = await fetch(playlistEndpoint, {
      method: 'GET',
      headers: headers,
    });

    if (response.ok) {
      const playlistData = await response.json();

      if (!playlistData) {
        console.error('Playlist data is null or undefined');
        return null;
      }

      const playlistName = playlistData.name;

      // Extract track details
      const tracks = playlistData.tracks.items.map(item => {
        const track = item.track;
        const artists = track.artists.map(artist => artist.name);

        return {
          title: track.name,
          artist: artists.join(', '),
          album: track.album.name,
          coverArtUrl: track.album.images[0].url,
          releaseDate: track.album.release_date,
          // Add more metadata fields here as needed
        };
      });

      return { playlistName, tracks };
    } else {
      console.error('Failed to fetch playlist details:', response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Error while getting playlist details:', error);
    return null;
  }
}