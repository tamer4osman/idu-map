import React from "react";
import ReactDOM from "react-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import moment from "moment";
import "./styles.css";
import { Legend } from "./Legend";
import { Loading } from "./Loading";
import {
  eventHasLatitudeAndLongitude,
  eventToLatLng,
  eventToTypeLatLng,
  eventLatLngSortComparer,
  mergeEventsWithSameCoordsAndTypeReducer,
  markEventsWithSameCoordsForOffsetReducer,
  mapDataToGeoJson
} from "./utils";
import {
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_STYLE_ID,
  IDMC_MAP_DATA_URL,
  IDMC_COLOR_CONFLICT,
  IDMC_COLOR_DISASTER,
  IDMC_COLOR_DEVELOPMENT,
  CLUSTERING_ENABLED,
  CIRCLE_RADIUS_SMALL_FIGURE,
  CIRCLE_RADIUS_MEDIUM_FIGURE,
  CIRCLE_RADIUS_LARGE_FIGURE
} from "./config";

const LAYER_ID_CLUSTER = "clusters";
const LAYER_ID_CLUSTER_COUNT = "clusters";
const LAYER_ID_POINTS = "points";
const LAYER_ID_POINTS_WITH_OFFSET = "points";
const SOURCE_ID_POINTS = "pointsdata";
const SOURCE_ID_POINTS_WITH_OFFSET = "pointsdataoffset";

const eventHasCoordinates = event => event.latitude && event.longitude;

function App() {
  return <Map />;
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

  getFilteredMapData(data, displacementTypes, lastXDaysFilter, sizeFilters) {
    const todayMinuxXDays = moment().subtract(lastXDaysFilter, "days");
    return this.mapData
      .filter(eventHasCoordinates)
      .filter(event => displacementTypes[event.displacement_type])
      .filter(event =>
        moment(event.displacement_start_date).isSameOrAfter(todayMinuxXDays)
      )
      .filter(event => {
        const figure = event.figure;
        if (figure < 100 && sizeFilters.small) return true;
        else if (figure >= 100 && figure <= 1000 && sizeFilters.medium)
          return true;
        else if (figure > 1000 && sizeFilters.large) return true;
        return false;
      })
      .sort(eventLatLngSortComparer)
      .reduce(mergeEventsWithSameCoordsAndTypeReducer, [])
      .reduce(markEventsWithSameCoordsForOffsetReducer, []);
  }
  getFilteredMapDataWithoutOffset(
    displacementTypes,
    lastXDaysFilter,
    sizeFilters
  ) {
    const withoutOffset = this.mapData.filter(e => !e.offsetFactor);
    return this.getFilteredMapData(
      withoutOffset,
      displacementTypes,
      lastXDaysFilter,
      sizeFilters
    );
  }
  getFilteredMapDataWithOffset(
    displacementTypes,
    lastXDaysFilter,
    sizeFilters
  ) {
    const withOffset = this.mapData.filter(e => e.offsetFactor);
    return this.getFilteredMapData(
      withOffset,
      displacementTypes,
      lastXDaysFilter,
      sizeFilters
    );
  }

  handleDisplacementTypeChange(value) {
    const currentState = this.state.displacementTypeFilters[value];
    const displacementTypeFilters = {
      ...this.state.displacementTypeFilters,
      [value]: !currentState
    };
    this.map
      .getSource(SOURCE_ID_POINTS)
      .setData(
        mapDataToGeoJson(
          this.getFilteredMapDataWithoutOffset(
            displacementTypeFilters,
            this.state.lastXDaysFilter,
            this.state.sizeFilters
          )
        )
      );
    this.setState({ displacementTypeFilters });
  }

  handleSizeFilterChange(value) {
    const currentState = this.state.sizeFilters[value];
    const sizeFilters = {
      ...this.state.sizeFilters,
      [value]: !currentState
    };
    this.map
      .getSource(SOURCE_ID_POINTS)
      .setData(
        mapDataToGeoJson(
          this.getFilteredMapDataWithoutOffset(
            this.state.displacementTypeFilters,
            this.state.lastXDaysFilter,
            sizeFilters
          )
        )
      );
    this.setState({ sizeFilters });
  }

  handleLastXDaysFilterChange(event) {
    const daysOfdisplacement = Number(event.target.value);
    this.setState({ lastXDaysFilter: daysOfdisplacement });
    this.map
      .getSource(SOURCE_ID_POINTS)
      .setData(
        mapDataToGeoJson(
          this.getFilteredMapDataWithoutOffset(
            this.state.displacementTypeFilters,
            daysOfdisplacement,
            this.state.sizeFilters
          )
        )
      );
  }

  initializeMapbox() {
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    const worldBounds = [-180, 90, 180, -90];
    this.map = new mapboxgl.Map({
      container: "map", // container id
      style: MAPBOX_STYLE_ID, // stylesheet location
      bounds: worldBounds
    });
  }

  registerMapOnLoadHandler() {
    this.map.on("load", () => {
      fetch(IDMC_MAP_DATA_URL)
        .then(response => response.json())
        .then(events => {
          this.mapData = events;
          this.setState({ loading: false });

          this.setupPointsDataSource();
          this.setupPointsLayer();
          this.setupPointsLayerHandlers();

          if (CLUSTERING_ENABLED) {
            this.setupClusterMechanics();
          }
        });
    });
  }
  setupPointsDataSource() {
    this.map.addSource(SOURCE_ID_POINTS, {
      type: "geojson",
      data: mapDataToGeoJson(
        this.getFilteredMapDataWithoutOffset(
          this.state.displacementTypeFilters,
          this.state.lastXDaysFilter,
          this.state.sizeFilters
        )
      ),
      cluster: CLUSTERING_ENABLED,
      clusterMaxZoom: 14, // Max zoom to cluster points on
      clusterRadius: 20 // Radius of each cluster when clustering points (defaults to 50)
    });
  }
  setupPointsLayer() {
    this.map.addLayer({
      id: LAYER_ID_POINTS,
      type: "circle",
      source: SOURCE_ID_POINTS,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": {
          property: "circleColor",
          type: "categorical",
          stops: [
            ["Conflict", IDMC_COLOR_CONFLICT],
            ["Disaster", IDMC_COLOR_DISASTER],
            ["Development", IDMC_COLOR_DEVELOPMENT]
          ]
        },
        "circle-opacity": 0.8,
        "circle-radius": {
          property: "circleRadius", // geojson property based on which you want too change the color
          base: 1.75,
          stops: [
            [0, CIRCLE_RADIUS_SMALL_FIGURE],
            [100, CIRCLE_RADIUS_MEDIUM_FIGURE],
            [1000, CIRCLE_RADIUS_LARGE_FIGURE]
          ]
        },
        "circle-stroke-width": 1,
        "circle-stroke-color": {
          property: "circleColor", // geojson property based on which you want too change the color
          type: "categorical",
          stops: [
            ["Conflict", IDMC_COLOR_CONFLICT],
            ["Disaster", IDMC_COLOR_DISASTER],
            ["Development", IDMC_COLOR_DEVELOPMENT]
          ]
        }
      }
    });
  }
  setupPointsLayerHandlers() {
    var popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    // When a click event occurs on a feature in the places layer, open a popup at the
    // location of the feature, with description HTML from its properties.
    this.map.on("click", LAYER_ID_POINTS, e => {
      var coordinates = e.features[0].geometry.coordinates.slice();
      var description2 = e.features[0].properties.descriptionPop;

      // Ensure that if the map is zoomed out such that multiple
      // copies of the feature are visible, the popup appears
      // over the copy being pointed to.
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }
      const x = new mapboxgl.Popup();

      x
        .setLngLat(coordinates)
        .setHTML(description2)
        .addTo(this.map).style;

      x._closeButton.style.color = "white";
      x._closeButton.style.fontSize = "24px";
    });

    this.map.on("mouseenter", LAYER_ID_POINTS, e => {
      // Change the cursor style as a UI indicator.
      this.map.getCanvas().style.cursor = "pointer";

      var coordinates = e.features[0].geometry.coordinates.slice();
      var description1 = e.features[0].properties.descriptionHover;

      // console.log(description1);
      // console.log(coordinates);

      // Ensure that if the map is zoomed out such that multiple
      // copies of the feature are visible, the popup appears
      // over the copy being pointed to.
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      // Populate the popup and set its coordinates
      // based on the feature found.
      popup
        .setLngLat(coordinates)
        .setHTML(description1)
        .addTo(this.map);
    });

    this.map.on("mouseleave", LAYER_ID_POINTS, () => {
      this.map.getCanvas().style.cursor = "";
      popup.remove();
    });
  }

  addMapControls() {
    // Add zoom and rotation controls to the map.
    this.map.addControl(
      new mapboxgl.NavigationControl({ position: "top-left" })
    );

    this.map.addControl(new mapboxgl.FullscreenControl());
    // Create a popup, but don't add it to the map yet.
  }
  setupClusterMechanics() {
    this.map.addLayer({
      id: LAYER_ID_CLUSTER,
      type: "circle",
      source: SOURCE_ID_POINTS,
      filter: ["has", "point_count"],
      paint: {
        // Use step expressions (https://www.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
        // with three steps to implement three types of circles:
        //   * Blue, 20px circles when point count is less than 100
        //   * Yellow, 30px circles when point count is between 100 and 750
        //   * Pink, 40px circles when point count is greater than or equal to 750
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#ee7d00",
          10,
          "#f28cb1",
          20,
          "#f28cb1"
        ],
        "circle-radius": ["step", ["get", "point_count"], 15, 5, 20, 10, 30]
      }
    });

    this.map.addLayer({
      id: LAYER_ID_CLUSTER_COUNT,
      type: "symbol",
      source: SOURCE_ID_POINTS,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 12
      }
    });

    // inspect a cluster on click
    this.map.on("click", LAYER_ID_CLUSTER, e => {
      var features = this.map.queryRenderedFeatures(e.point, {
        layers: [LAYER_ID_CLUSTER]
      });
      var clusterId = features[0].properties.cluster_id;
      this.map
        .getSource("point")
        .getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;

          this.map.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom
          });
        });
    });

    this.map.on("mouseenter", LAYER_ID_CLUSTER, () => {
      this.map.getCanvas().style.cursor = "pointer";
    });
    this.map.on("mouseleave", LAYER_ID_CLUSTER, () => {
      this.map.getCanvas().style.cursor = "";
    });
  }

  componentDidMount() {
    this.initializeMapbox();
    this.addMapControls();
    this.registerMapOnLoadHandler();
  }

  render() {
    return (
      <div>
        <div id="map" />
        {this.state.loading && <Loading />}
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
ReactDOM.render(<App />, rootElement);
