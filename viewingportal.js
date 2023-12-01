jQuery(document).ready(function () {

    chrome.storage.local.get('playlistData', function (data) {
        const playlistData = data.playlistData;
        console.log(playlistData);
        const playlistContainer = document.getElementById('playlist-container');
        let playlistHTML = '<ul>';
        // put the playlist title in the container playlist-title
        document.getElementById('playlist-title').innerHTML = playlistData.playlistName;

        playlistData.tracks.forEach(track => {
            playlistHTML += `
            <li>
                <img src="${track.coverArtUrl}" alt="Album Cover">
                <div class="track-details">
                    <h3>${track.title}</h3>
                    <p>Artist: ${track.artist}</p>
                    <p>Album: ${track.album}</p>
                    <p>Release Date: ${track.releaseDate}</p>
                </div>
            </li>`;
        });

        playlistHTML += '</ul>';
        playlistContainer.innerHTML = playlistHTML;
    });


});



