
var helpers = require('./../../helpers.js')
var spotifyActions = require('./actions.js')
var uiActions = require('../ui/actions.js')

const SpotifyMiddleware = (function(){

    /**
     * The actual middleware inteceptor
     **/
    return store => next => action => {
        var state = store.getState();

        switch(action.type){

            case 'SPOTIFY_CONNECT':
                store.dispatch( spotifyActions.getMe() )
                break

            case 'SPOTIFY_DISCONNECTED':
                store.dispatch( uiActions.createNotification('Spotify disconnected','bad') )
                break

            case 'SPOTIFY_CREATE_PLAYLIST':
                if( !store.getState().spotify.authorized ){
                    store.dispatch( uiActions.createNotification( "Must be logged in to Spotify to do that", 'bad' ) )
                    return
                }
                store.dispatch( spotifyActions.createPlaylist( action.name, action.is_private ))
                break

            case 'SPOTIFY_REMOVE_PLAYLIST_TRACKS':
                var playlist = state.ui.playlists[action.key]

                if( !store.getState().spotify.authorized ){
                    store.dispatch( uiActions.createNotification( "Must be logged in to Spotify to do that", 'bad' ) )
                    return
                }
                if( !store.getState().spotify.me || store.getState().spotify.me.id != playlist.owner.id ){
                    store.dispatch( uiActions.createNotification( "You can't edit a playlist you don't own", 'bad' ) )
                    return
                }
                store.dispatch( spotifyActions.deleteTracksFromPlaylist( playlist.uri, playlist.snapshot_id, action.tracks_indexes ))
                break


            case 'SPOTIFY_ADD_PLAYLIST_TRACKS':

                if( !store.getState().spotify.authorized ){
                    store.dispatch( uiActions.createNotification( "Must be logged in to Spotify to do that", 'bad' ) )
                    return
                }
                store.dispatch( spotifyActions.addTracksToPlaylist( action.key, action.tracks_uris ))
                break


            case 'SPOTIFY_REORDER_PLAYLIST_TRACKS':

                if( !store.getState().spotify.authorized ){
                    store.dispatch( uiActions.createNotification( "Must be logged in to Spotify to do that", 'bad' ) )
                    return
                }

                if( !store.getState().spotify.me || store.getState().spotify.me.id != helpers.getFromUri('artistid',action.key) ){
                    store.dispatch( uiActions.createNotification( "You can't edit a playlist you don't own", 'bad' ) )
                    return
                }
                store.dispatch( spotifyActions.reorderPlaylistTracks( action.key, action.range_start, action.range_length, action.insert_before, action.snapshot_id ))
                break


            case 'SPOTIFY_SAVE_PLAYLIST':

                if( !store.getState().spotify.authorized ){
                    store.dispatch( uiActions.createNotification( "Must be logged in to Spotify to do that", 'bad' ) )
                    return
                }
                store.dispatch( spotifyActions.savePlaylist( action.key, action.name, action.is_public ))
                break

            // when our mopidy server current track changes
            case 'MOPIDY_CURRENTTLTRACK':

                // proceed as usual so we don't inhibit default functionality
                next(action)

                // if the current track is a spotify track
                if( action.data && action.data.track.uri.substring(0,14) == 'spotify:track:' ){
                    store.dispatch( spotifyActions.getTrack( action.data.track.uri ) )
                }
                break

            // when our mopidy server current track changes
            case 'RADIO':

                // proceed as usual so we don't inhibit default functionality
                next(action)

                // only resolve if radio is enabled
                if( action.data.radio.enabled ){
                    store.dispatch(spotifyActions.resolveRadioSeeds(action.data.radio))
                }
                break

            case 'SPOTIFY_PLAYLIST_FOLLOWING_LOADED':
                store.dispatch({
                    type: 'PLAYLIST_LOADED',
                    key: action.key,
                    playlist: {
                        is_following: action.is_following
                    }
                });
                break

            case 'SPOTIFY_ALBUM_FOLLOWING_LOADED':
                store.dispatch({
                    type: 'ALBUM_LOADED',
                    key: action.key,
                    album: {
                        is_following: action.is_following
                    }
                });
                break

            case 'SPOTIFY_ARTIST_FOLLOWING_LOADED':
                store.dispatch({
                    type: 'ARTIST_LOADED',
                    key: action.key,
                    artist: {
                        is_following: action.is_following
                    }
                });
                break

            case 'SPOTIFY_USER_FOLLOWING_LOADED':
                store.dispatch({
                    type: 'USER_LOADED',
                    key: action.key,
                    user: {
                        is_following: action.is_following
                    }
                });
                break

            case 'SPOTIFY_NEW_RELEASES_LOADED':
                store.dispatch({
                    type: 'ALBUMS_LOADED',
                    albums: action.data.albums.items
                });
                store.dispatch({
                    type: 'NEW_RELEASES_LOADED',
                    uris: helpers.asURIs(action.data.albums.items),
                    more: action.data.albums.next,
                    total: action.data.albums.total
                });
                break

            case 'SPOTIFY_ARTIST_ALBUMS_LOADED':
                store.dispatch({
                    type: 'ALBUMS_LOADED',
                    albums: action.data.items
                });
                store.dispatch({
                    type: 'ARTIST_ALBUMS_LOADED',
                    key: action.key,
                    uris: helpers.asURIs(action.data.items),
                    more: action.data.next,
                    total: action.data.total
                });
                break

            case 'SPOTIFY_USER_PLAYLISTS_LOADED':
                var playlists = []
                for( var i = 0; i < action.data.items.length; i++ ){
                    var playlist = Object.assign(
                        {},
                        action.data.items[i],
                        {
                            can_edit: (store.getState().spotify.authorized && store.getState().spotify.me && action.data.items[i].owner.id == store.getState().spotify.me.id),
                            tracks_total: action.data.items[i].tracks.total
                        }
                    )

                    // remove our tracklist. It'll overwrite any full records otherwise
                    delete playlist.tracks

                    playlists.push(playlist)
                }

                store.dispatch({
                    type: 'PLAYLISTS_LOADED',
                    playlists: playlists
                });

                store.dispatch({
                    type: 'USER_PLAYLISTS_LOADED',
                    key: action.key,
                    uris: helpers.asURIs(playlists),
                    more: action.data.next,
                    total: action.data.total
                });
                break

            case 'SPOTIFY_CATEGORY_PLAYLISTS_LOADED':
                var playlists = []
                for( var i = 0; i < action.data.playlists.items.length; i++ ){
                    var playlist = Object.assign(
                        {},
                        action.data.playlists.items[i],
                        {
                            can_edit: (store.getState().spotify.authorized && store.getState().spotify.me && action.data.playlists.items[i].owner.id == store.getState().spotify.me.id),
                            tracks_total: action.data.playlists.items[i].tracks.total
                        }
                    )

                    // remove our tracklist. It'll overwrite any full records otherwise
                    delete playlist.tracks

                    playlists.push(playlist)
                }

                store.dispatch({
                    type: 'PLAYLISTS_LOADED',
                    playlists: playlists
                });

                store.dispatch({
                    type: 'CATEGORY_PLAYLISTS_LOADED',
                    key: action.key,
                    uris: helpers.asURIs(playlists),
                    more: action.data.playlists.next,
                    total: action.data.playlists.total
                });
                break

            case 'SPOTIFY_LIBRARY_PLAYLISTS_LOADED':
                var playlists = []
                for( var i = 0; i < action.playlists.length; i++ ){
                    var playlist = Object.assign(
                        {},
                        action.playlists[i],
                        {
                            can_edit: (store.getState().spotify.authorized && store.getState().spotify.me && action.playlists[i].owner.id == store.getState().spotify.me.id),
                            tracks_total: action.playlists[i].tracks.total
                        }
                    )

                    // remove our tracklist. It'll overwrite any full records otherwise
                    delete playlist.tracks

                    playlists.push(playlist)
                }

                store.dispatch({
                    type: 'PLAYLISTS_LOADED',
                    playlists: playlists
                });

                store.dispatch({
                    type: 'LIBRARY_PLAYLISTS_LOADED',
                    uris: helpers.asURIs(playlists)
                });
                break

            case 'SPOTIFY_LIBRARY_ARTISTS_LOADED':
                store.dispatch({
                    type: 'ARTISTS_LOADED',
                    artists: action.data.artists.items
                });
                store.dispatch({
                    type: 'LIBRARY_ARTISTS_LOADED',
                    uris: helpers.asURIs(action.data.artists.items),
                    more: action.data.artists.next,
                    total: action.data.artists.total
                });
                break

            case 'SPOTIFY_LIBRARY_ALBUMS_LOADED':
                var albums = []
                for (var i = 0; i < action.data.items.length; i++){
                    albums.push(
                        Object.assign(
                            {},
                            action.data.items[i].album,
                            {
                                added_at: action.data.items[i].added_at,
                                tracks: action.data.items[i].album.tracks.items,
                                tracks_more: action.data.items[i].album.tracks.next,
                                tracks_total: action.data.items[i].album.tracks.total
                            }
                        )
                    )
                }

                store.dispatch({
                    type: 'ALBUMS_LOADED',
                    albums: albums
                });

                store.dispatch({
                    type: 'LIBRARY_ALBUMS_LOADED',
                    uris: helpers.asURIs(albums),
                    more: action.data.next,
                    total: action.data.total
                });
                break

            case 'SPOTIFY_SEARCH_RESULTS_LOADED_MORE_TRACKS':
                store.dispatch({
                    type: 'SEARCH_RESULTS_LOADED',
                    tracks: action.data.tracks.items,
                    tracks_more: action.data.tracks.next
                });
                break

            case 'SPOTIFY_SEARCH_RESULTS_LOADED_MORE_ARTISTS':
                
                store.dispatch({
                    type: 'ARTISTS_LOADED',
                    artists: action.data.artists.items
                });

                store.dispatch({
                    type: 'SEARCH_RESULTS_LOADED',
                    playlists_uris: helpers.asURIs(action.data.playlists.items),
                    playlists_more: action.data.playlists.next
                });
                break

            case 'SPOTIFY_SEARCH_RESULTS_LOADED_MORE_ALBUMS':

                store.dispatch({
                    type: 'ALBUMS_LOADED',
                    albums: action.data.albums.items
                });

                store.dispatch({
                    type: 'SEARCH_RESULTS_LOADED',
                    albums_uris: helpers.asURIs(action.data.albums.items),
                    albums_more: action.data.albums.next
                });
                break

            case 'SPOTIFY_SEARCH_RESULTS_LOADED_MORE_PLAYLISTS':

                var playlists = []
                for (var i = 0; i < action.data.playlists.items.length; i++){
                    playlists.push(Object.assign(
                        {},
                        action.data.playlists.items[i],
                        {
                            can_edit: (getState().spotify.me && action.data.playlists.items[i].owner.id == getState().spotify.me.id),
                            tracks_total: action.data.playlists.items[i].tracks.total
                        }
                    ))
                }

                store.dispatch({
                    type: 'PLAYLISTS_LOADED',
                    playlists: playlists
                });

                store.dispatch({
                    type: 'SEARCH_RESULTS_LOADED',
                    playlists_uris: helpers.asURIs(action.data.playlists.items),
                    playlists_more: action.data.playlists.next
                });
                break

            // This action is irrelevant to us, pass it on to the next middleware
            default:
                return next(action);
        }
    }

})();

export default SpotifyMiddleware