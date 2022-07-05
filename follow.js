
var map = L.map('map').setView([53.1305, -8.9255], 17);
var locdata;
var sylvain;
var fps = 30;

function seqPan(i) {

    let poi = locdata.features[i];
    let nextloc = [poi.properties.lat, poi.properties.lon];

    if (i === 0) {
        map.flyTo(nextloc, 19);
        setTimeout(seqPan, 2000, i + 1);
        sylvain = L.circle(nextloc, {
                color: "white",
                opacity: 0.5,
                fillColor: "white",
                fillOpacity: 1,
                radius: 1
            }).addTo(map);
        setTimeout(updateSylvain, 5000);
    } else {
        // get the previous POI to calculate the transition time
        let ppoi = locdata.features[i-1];
        let timediff = (poi.properties.ts - ppoi.properties.ts)/1000;

        map.panTo(nextloc, {
            duration: timediff/1000, // milliseconds to seconds
            easeLinearity: 1
        });

        setTimeout(seqPan, timediff, i + 1);
    }
}

function updateSylvain() {
    // this is a hack, but works for now - need to translate location between points over time
    // independently of map view
    sylvain.setLatLng(map.getCenter());
    setTimeout(updateSylvain, 1000/fps);
}

var tiles = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    id: 'mapbox/satellite-v9',
    accessToken: "pk.eyJ1IjoiY3lyaWxsZW1kYyIsImEiOiJjazIwamZ4cXIwMzN3M2hscmMxYjgxY2F5In0.0BmIVj6tTvXVd2BmmFo6Nw",
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


// load the data
fetch("data/set3.geojson")
    .then(function(response) { return response.json(); })
    .then(function(data) {
        locdata = data;
        /*
        L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                return L.circle(latlng, feature.properties.hdop);
            },
            style: {
                color: "blue",
                opacity: 0.5
            }
        }).addTo(map);
        */

        // start the panning
        seqPan(0);
    });
