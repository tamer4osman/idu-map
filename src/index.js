import React from "react";
import ReactDOM from "react-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import forEach from "lodash/fp/forEach";
import map from "lodash/fp/map";
import moment from "moment";
import "./styles.css";
import { Legend } from "./Legend";
import { Loading } from "./Loading";
import { BrowserNotSupported } from "./BrowserNotSupported";
import {
  mapDataToGeoJson,
  rawDataToOffsetGrouped,
} from "./utils";
import {
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_STYLE_ID,
  IDMC_MAP_DATA_URL,
  IDMC_COLOR_CONFLICT,
  IDMC_COLOR_DISASTER,
  IDMC_COLOR_DEVELOPMENT,
  CIRCLE_HORIZONTAL_PIXEL_OFFSET_ON_EVENTS_WITH_SAME_TYPE_AND_SAME_COORDINATES,
  CIRCLE_VERTICAL_PIXEL_OFFSET_ON_EVENTS_WITH_SAME_TYPE_AND_SAME_COORDINATES,
  CIRCLE_RADIUS_SMALL_FIGURE,
  CIRCLE_RADIUS_MEDIUM_FIGURE,
  CIRCLE_RADIUS_LARGE_FIGURE,
  MAPBOX_INITIAL_CENTER,
  MAPBOX_INITIAL_ZOOM,
} from "./config";

const sourceName = offsetFactor => 'source' + offsetFactor;
const layerName = offsetFactor => 'layer' + offsetFactor;

const eventHasCoordinates = event => event.latitude && event.longitude;

function App() {
  return <Map/>;
}

const filterMapData = (data, displacementTypeFilters, lastXDaysFilter, sizeFilters) => {
  const todayMinuxXDays = moment().subtract(lastXDaysFilter, "days");
  return data
      .filter(eventHasCoordinates)
      .filter(event => displacementTypeFilters[ event.displacement_type ])
      .filter(event =>
          moment(event.displacement_date).isSameOrAfter(todayMinuxXDays)
      )
      .filter(event => {
        const figure = event.figure;
        if (figure < 100 && sizeFilters.small) return true;
        else if (figure >= 100 && figure <= 1000 && sizeFilters.medium)
          return true;
        else if (figure > 1000 && sizeFilters.large) return true;
        return false;
      })
};

const configureMapOffsetRenderer = (map, offsetFactor) => {
  // Don't do if already done (i.e. if source already configured)
  if (map.getSource(sourceName(offsetFactor))) return;

  map.addSource(sourceName(offsetFactor), {
    type: "geojson",
    data: mapDataToGeoJson([]),
  });
  
  map.addLayer({
    id: layerName(offsetFactor),
    type: "circle",
    source: sourceName(offsetFactor),
    paint: {
      "circle-color": {
        property: "circleColor",
        type: "categorical",
        stops: [
          [ "Conflict", IDMC_COLOR_CONFLICT ],
          [ "Disaster", IDMC_COLOR_DISASTER ],
          [ "Development", IDMC_COLOR_DEVELOPMENT ]
        ]
      },
      "circle-opacity": 0.8,
      "circle-radius": {
        property: "circleRadius", // geojson property based on which you want too change the color
        base: 1.75,
        stops: [
          [ 0, CIRCLE_RADIUS_SMALL_FIGURE ],
          [ 100, CIRCLE_RADIUS_MEDIUM_FIGURE ],
          [ 1000, CIRCLE_RADIUS_LARGE_FIGURE ]
        ]
      },
      "circle-stroke-width": 1,
      "circle-stroke-color": {
        property: "circleColor", // geojson property based on which you want too change the color
        type: "categorical",
        stops: [
          [ "Conflict", IDMC_COLOR_CONFLICT ],
          [ "Disaster", IDMC_COLOR_DISASTER ],
          [ "Development", IDMC_COLOR_DEVELOPMENT ]
        ]
      },
      "circle-translate": [
        CIRCLE_HORIZONTAL_PIXEL_OFFSET_ON_EVENTS_WITH_SAME_TYPE_AND_SAME_COORDINATES * offsetFactor,
        CIRCLE_VERTICAL_PIXEL_OFFSET_ON_EVENTS_WITH_SAME_TYPE_AND_SAME_COORDINATES * offsetFactor,
      ],
    }
  });

  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
  });

  // When a click event occurs on a feature in the places layer, open a popup at the
  // location of the feature, with description HTML from its properties.
  map.on("click", layerName(offsetFactor), e => {
    const coordinates = e.features[ 0 ].geometry.coordinates.slice();
    const description2 = e.features[ 0 ].properties.descriptionPop;

    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coordinates[ 0 ]) > 180) {
      coordinates[ 0 ] += e.lngLat.lng > coordinates[ 0 ] ? 360 : -360;
    }
    const x = new mapboxgl.Popup();

    x.setLngLat(coordinates).setHTML(description2).addTo(map);

    x._closeButton.style.color = "white";
    x._closeButton.style.fontSize = "24px";
  });

  map.on("mouseenter", layerName(offsetFactor), e => {
    // Change the cursor style as a UI indicator.
    map.getCanvas().style.cursor = "pointer";

    const coordinates = e.features[ 0 ].geometry.coordinates.slice();
    const description1 = e.features[ 0 ].properties.descriptionHover;

    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coordinates[ 0 ]) > 180) {
      coordinates[ 0 ] += e.lngLat.lng > coordinates[ 0 ] ? 360 : -360;
    }

    // Populate the popup and set its coordinates
    // based on the feature found.
    popup
        .setLngLat(coordinates)
        .setHTML(description1)
        .addTo(map);
  });

  map.on("mouseleave", layerName(offsetFactor), () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  });

  return events => map
      .getSource(sourceName(offsetFactor))
      .setData(
          mapDataToGeoJson(
            events,
          )
      )
}

class Map extends React.Component {
  state = {
    loading: true,
    initialResults: [],
    results: [],
    map: {},
    displacementTypeFilters: {
      Conflict: true,
      Disaster: true,
      Development: true
    },
    sizeFilters: {
      small: true,
      medium: true,
      large: true
    },
    lastXDaysFilter: 30
  };

  // Cache to store renderers for each offset factor
  offsetFactorRenderers = {}

  handleDisplacementTypeChange(value) {
    const currentState = this.state.displacementTypeFilters[ value ];
    const displacementTypeFilters = {
      ...this.state.displacementTypeFilters,
      [ value ]: !currentState
    };
    this.setState({ displacementTypeFilters }, () => this.updateMap());
  }

  handleSizeFilterChange(value) {
    const currentState = this.state.sizeFilters[ value ];
    const sizeFilters = {
      ...this.state.sizeFilters,
      [ value ]: !currentState
    };
    this.setState({ sizeFilters }, () => this.updateMap());
  }

  handleLastXDaysFilterChange(event) {
    const daysOfdisplacement = Number(event.target.value);
    this.setState({ lastXDaysFilter: daysOfdisplacement }, () => this.updateMap());
  }

  initializeMapbox() {
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    window.map = this.map = new mapboxgl.Map({
      container: "map", // container id
      style: MAPBOX_STYLE_ID, // stylesheet location
      center: MAPBOX_INITIAL_CENTER,
      zoom: MAPBOX_INITIAL_ZOOM
    });
    this.addMapControls();
  }

  onMapReady() {
    return new Promise(resolve => {
      this.map.on("load", () => resolve());
    })
  }

  fetchIdmcData() {
    return fetch(IDMC_MAP_DATA_URL).then(response => response.json());
  }

  addMapControls() {
    // Add zoom and rotation controls to the map.
    this.map.addControl(
        new mapboxgl.NavigationControl({ position: "top-left" })
    );

    this.map.addControl(new mapboxgl.FullscreenControl());
    // Create a popup, but don't add it to the map yet.
  }

  updateMap() {
    const events = filterMapData(
      this.rawEvents,
      this.state.displacementTypeFilters,
      this.state.lastXDaysFilter,
      this.state.sizeFilters,
    )
    
    // Group all the events we have into offset groups
    const offsetGroups = rawDataToOffsetGrouped(events);

    // Go through every offsetFactor
    for (const offsetFactor in offsetGroups) {
      // Get renderer for this offsetFactor. For optimization purposes, the function
      // configureMapOffsetRenderer will return undefined if a renderer is already configured.
      // If a renderer were re-created, the map goes through a "blink" effect (due to events being
      // removed and then re-inserted).
      // Store all offsetFactor renderers in dictioanry
      const offsetFactorRenderer = configureMapOffsetRenderer(this.map, offsetFactor)
      if (offsetFactorRenderer) {
        this.offsetFactorRenderers[offsetFactor] = offsetFactorRenderer;
      }
    }

    // Loop through all renderers. Get the data to show in each one - if none available,
    // render with none (necessary for the case of going from some data on the map to none)
    for (const offsetFactor in this.offsetFactorRenderers) {
      const events = offsetGroups[offsetFactor] || []
      this.offsetFactorRenderers[offsetFactor](events)
    }
  }

  componentDidMount() {
    if (!mapboxgl.supported()) {
      return;
    }

    this.initializeMapbox();
    this.onMapReady()
        .then(() => this.fetchIdmcData())
        .then(events => {
          this.rawEvents = events
          this.updateMap()

          this.setState({ loading: false });
        })
  }

  render() {
    if (!mapboxgl.supported()) {
      return <BrowserNotSupported/>;
    }
    return (
        <div>
          <div id="map"/>
          {this.state.loading && <Loading/>}
          <Legend
              displacementTypeFilters={this.state.displacementTypeFilters}
              sizeFilters={this.state.sizeFilters}
              onLastXDaysFilterChange={this.handleLastXDaysFilterChange.bind(this)}
              onDisplacementTypeChange={this.handleDisplacementTypeChange.bind(
                  this
              )}
              onSizeFilterChange={this.handleSizeFilterChange.bind(this)}
          />
        </div>
    );
  }
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App/>, rootElement);
