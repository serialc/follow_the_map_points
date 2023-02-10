
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

    // if there's any other features to underlay, add them
    for (let i = 0; i < RTR.other_data.length; i+=1) {
        L.geoJSON(RTR.other_data[i], {
            style: {
                color: 'orange',
                opacity: 0.8
            }
        }).addTo(RTR.map);
    }

    // if they want to show the points, not just the moving point
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
    // only reverse copy/slice not original data (and handle when long, lat, elev are provided)
    let nextloc = poi.geometry.coordinates.slice(0,2).reverse();

    // if this is the first point
    if (i === 0) {
        //RTR.map.panTo(nextloc, 19);
        // wait two seconds before you start
        setTimeout(RTR.seqPan, 2000, i + 1);

        // create moving point
        RTR.whitehat = L.circleMarker(nextloc, {
                color: "black",
                opacity: 0.5,
                fillColor: "white",
                fillOpacity: 1,
                radius: 10
            }).addTo(RTR.map);

    } else {
        // get the previous POI (where we're moving from and currently are)
        // to calculate the transition time
        let ppoi = RTR.data.features[i-1];

        // calculate time - we'll improve this later to be flexible
        let ms_diff = (Date.parse(poi.properties[RTR.date_field_name]) - Date.parse(ppoi.properties[RTR.date_field_name]));

        // make the pan last the difference in time between this and the next location
        RTR.map.panTo(nextloc, {
            duration: ms_diff/1000/RTR.multiplier, // milliseconds to seconds
            easeLinearity: 1
        });
        
        // pass the white hat it's moving directions
        // only reverse copy/slice not original data (and handle when long, lat, elev are provided)
        let prevloc = ppoi.geometry.coordinates.slice(0,2).reverse();
        let shift = [(nextloc[0] - prevloc[0]), (nextloc[1] - prevloc[1])];

        // have the white hat self-manage its movement
        RTR.updateWhiteHat(prevloc, shift, ms_diff/1000 * RTR.fps/RTR.multiplier, 0);

        // update map panning focus
        setTimeout(RTR.seqPan, ms_diff/RTR.multiplier, i + 1);
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
    // an array to store other feature classes to display
    RTR.other_data = [];

    let textarea = document.getElementById('geojson_data');
    let features_textarea = document.getElementById('other_geojson_data');

    document.getElementById('load_demo_data').onclick = function() {
        fetch("data/set3.geojson")
            .then(function(response) { return response.text(); })
            .then(function(data) {
                textarea.value = data;
            });
    };
    document.getElementById('clear_other_geojson_data').onclick = function() {
        features_textarea.value = '';
    };
    document.getElementById('add_other_geojson_data').onclick = function() {
        RTR.other_data.push(JSON.parse(features_textarea.value));
        let fcount = RTR.other_data[RTR.other_data.length-1].features.length;
        document.getElementById('fmesg').innerHTML = "Added " + fcount + " features.";
        // clear the textarea inputs
        features_textarea.value = '';
    };
    document.getElementById('submit_geojson_data').onclick = function() {

        // check that the textarea/GeoJSON is not empty
        if (textarea.value === '') {
            alert("You must provide GeoJSON point data.");
            return;
        }

        // parse JSON
        RTR.data = JSON.parse(textarea.value);

        // get the date field name and save it
        RTR.date_field_name = document.getElementById('dtfield').value;
        if (RTR.date_field_name === '') {
            alert("No date-time field provided!");
            return;
        }


        // get the multiplier - set to 1 if blank
        RTR.multiplier = document.getElementById('multiplier').value;
        RTR.multiplier = RTR.multiplier === '' ? 1 : RTR.multiplier;

        // are we going to show all data
        RTR.show_all_points = document.getElementById('showalldata').checked;

        // added features textarea should be empty
        if (features_textarea.value !== '') {
            alert("Did you forget to add the additonal GeoJSON features?");
            return;
        }

        // get the zoom level
        let zoomlvl = document.getElementById('zoom_lvl').value;
        if (isNaN(zoomlvl)) { zoomlvl = 19; }

        // get the first point
        let fp = RTR.data.features[0];

        // create the map pointing at the first data point
        // only reverse copy/slice not original data (and handle when long, lat, elev are provided)
        RTR.createMap(fp.geometry.coordinates.slice().reverse(0,2), zoomlvl, RTR.show_all_points);

        // hide the overlay
        document.getElementById('overlay').style.display = 'none';

        // start the sequential pans
        RTR.seqPan(0);
    };

}());
