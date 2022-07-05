
var RTR = {fps: 30};

RTR.createMap = function(latlng, zoom, display_data)
{
    RTR.map = L.map('map').setView(latlng, zoom);

    var tiles = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        id: 'mapbox/satellite-v9',
        accessToken: "pk.eyJ1IjoiY3lyaWxsZW1kYyIsImEiOiJjazIwamZ4cXIwMzN3M2hscmMxYjgxY2F5In0.0BmIVj6tTvXVd2BmmFo6Nw",
        attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(RTR.map);

    if (display_data) {
        L.geoJSON(RTR.data, {
            pointToLayer: function(feature, latlng) {
                if ( feature.properties.hdop ) {
                    // use horizontal dilution of precision if present
                    return L.circle(latlng, feature.properties.hdop);
                } else {
                    return L.circle(latlng, 2);
                }
            },
            style: {
                color: "blue",
                opacity: 0.5
            }
        }).addTo(RTR.map);
    }
};

RTR.seqPan = function(i) {

    // stop panning if at end of data
    if ( i >= RTR.data.features.length ) {
        return;
    }

    // get the next poi - it's where we're move towards
    let poi = RTR.data.features[i];
    // only reverse copy/slice not original data
    let nextloc = poi.geometry.coordinates.slice().reverse();

    // if this is the first point
    if (i === 0) {
        //RTR.map.panTo(nextloc, 19);
        setTimeout(RTR.seqPan, 0, i + 1);

        // create moving point
        RTR.whitehat = L.circle(nextloc, {
                color: "white",
                opacity: 0.5,
                fillColor: "white",
                fillOpacity: 1,
                radius: 1
            }).addTo(RTR.map);

    } else {
        // get the previous POI (where we're moving from and currently are)
        // to calculate the transition time
        let ppoi = RTR.data.features[i-1];

        // calculate time - we'll improve this later to be flexible
        let ms_diff = (Date.parse(poi.properties[RTR.date_field_name]) - Date.parse(ppoi.properties[RTR.date_field_name]));

        // make the pan last the difference in time between this and the next location
        RTR.map.panTo(nextloc, {
            duration: ms_diff/1000, // milliseconds to seconds
            easeLinearity: 1
        });
        
        // pass the white hat it's moving directions
        // only reverse copy/slice not original data
        let prevloc = ppoi.geometry.coordinates.slice().reverse();
        let shift = [(nextloc[0] - prevloc[0]), (nextloc[1] - prevloc[1])];

        // have the white hat self manage its movement
        RTR.updateWhiteHat(prevloc, shift, ms_diff/1000 * RTR.fps, 0);

        // update map panning focus
        setTimeout(RTR.seqPan, ms_diff, i + 1);
    }
}

RTR.updateWhiteHat = function(prevloc, shift_latlng, iter, i)
{

    // update white hat circle location
    RTR.whitehat.setLatLng([
        prevloc[0] + ((shift_latlng[0]/iter) * i),
        prevloc[1] + ((shift_latlng[1]/iter) * i)]);

    if (i < iter) {
        setTimeout(RTR.updateWhiteHat, 1000/RTR.fps, prevloc, shift_latlng, iter, i + 1);
    } 
};

// initialization
(function() {
    let textarea = document.getElementById('geojson_data');

    document.getElementById('load_demo_data').onclick = function() {
        fetch("data/set3.geojson")
            .then(function(response) { return response.text(); })
            .then(function(data) {
                textarea.value = data;
            });
    };
    document.getElementById('submit_geojson_data').onclick = function() {
        // parse JSON
        RTR.data = JSON.parse(textarea.value);

        // get the date field name and save it
        RTR.date_field_name = document.getElementById('dtfield').value;
        // are we going to show all data
        RTR.show_all_points = document.getElementById('showalldata').checked;

        // get the first point
        let fp = RTR.data.features[0];

        // create the map pointing at the first data point
        // slice is to create copy rather than modify data
        RTR.createMap(fp.geometry.coordinates.slice().reverse(), 19, RTR.show_all_points);

        // hide the overlay
        document.getElementById('overlay').style.display = 'none';

        // start the sequential pans
        RTR.seqPan(0);
    };

}());
