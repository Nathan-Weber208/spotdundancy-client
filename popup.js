// popup.js
document.addEventListener("DOMContentLoaded", async function () {
  // Clear local storage
  // localStorage.clear();
  const playlistNameElement = document.getElementById("playlistName");
  const closeButton = document.getElementById("closeButton");
  const DownloadMP3Button = document.getElementById("DownloadMP3Button");
  const DownloadCSVButton = document.getElementById("DownloadCSVButton");
  const SeePlaylistButton = document.getElementById("SeePlaylistButton");
  // call getPlaylistDetails() and make sure it's done before continuing
  await getPlaylistDetails();



  // get playlistName and tracks from local storage
  const playlistName = localStorage.getItem('playlistName');
  const tracks = localStorage.getItem('tracks');
  console.log('Playlist Name:', playlistName);
  console.log('Tracks:', tracks);
  // put the playlist title in the container playlist-title
  playlistNameElement.innerHTML = playlistName;
  // put the number of tracks in the container numTracks with the words "Tracks in playlist"
  // calculate the number of tracks in the playlist by unstringifying the tracks and getting the length
  const numTracks = JSON.parse(tracks).length;
  document.getElementById('numTracks').innerHTML = `${numTracks} Tracks in playlist`;

  // Close button
  closeButton.addEventListener("click", () => {
    window.close();
  });

  // Download CSV button
  DownloadCSVButton.addEventListener("click", async () => {
    // pull from local storage
    const playlistName = localStorage.getItem('playlistName');
    // unstringify the tracks
    const tracks = JSON.parse(localStorage.getItem('tracks'));
    // call savePlaylistToCSV()
    await savePlaylistToCSV(playlistName, tracks);
  });

  // Download MP3 button
  DownloadMP3Button.addEventListener("click", async () => {
    const playlistName = localStorage.getItem('playlistName');
    const tracks = localStorage.getItem('tracks');
    console.log({ playlistName, tracks });

    console.log("JSON:")
    // stringify both playlistName and tracks in one JSON object
    console.log(JSON.stringify({ playlistName, tracks }));
  });


  // See Playlist button
  SeePlaylistButton.addEventListener("click", async () => {

    chrome.tabs.create({ url: 'viewingportal.html' });

  });

  // check the url of the current tab if it doesnt start with https://open.spotify.com/playlist/ then hide all buttons except for the close button
  // also add a message to the user saying "Please navigate to a Spotify playlist to use this extension"
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var currentTab = tabs[0];
    if (!currentTab.url.startsWith('https://open.spotify.com/playlist/')) {
        // Hide all buttons except for the close button
        document.querySelectorAll('button:not(#closeButton)').forEach(button => {
            button.style.display = 'none';
        });
        // remove the playlist title and number of tracks
        document.getElementById('playlistName').style.display = 'none';
        document.getElementById('numTracks').style.display = 'none';
        // Show a message to the user
        var messageElement = document.createElement('p');
        messageElement.textContent = 'Please navigate to a Spotify playlist to use this extension';
        document.body.appendChild(messageElement);
    }
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
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const playlistUrl = tabs[0].url;

      // Extract the playlist ID from the URL if provided
      const playlistIdMatch = playlistUrl.match(/playlist\/(\w+)/);
      if (!playlistIdMatch) {
        throw new Error('Invalid playlist URL');
      }
      const playlistId = playlistIdMatch[1];

      //  JACOB'S CLIENT ID AND SECRET!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
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
        // Store playlistName and tracks in local storage
        localStorage.setItem('playlistName', playlistName);

        // Store tracks in local storage stringified
        localStorage.setItem('tracks', JSON.stringify(tracks));
      } else {
        console.error('Failed to fetch playlist details:', response.statusText);
      }
    });
  } catch (error) {
    console.error('Error while getting playlist details:', error);
  }
}