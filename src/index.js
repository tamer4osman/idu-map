import React from "react";
import ReactDOM from "react-dom";
import mapboxgl from "mapbox-gl";

import "./styles.css";

const layerColours = {
  conflict: "#ee7d00",
  disaster: "#008dcc",
  development: "#33953e"
};

const mapboxToken =
  "pk.eyJ1IjoiaWRtY2RhIiwiYSI6ImNqY2JyNDZzazBqa2gycG8yNTh2eHM4dGYifQ.EOazpb8QxCCEKhhtrVjnYA";
const idmcUrl = "https://backend.idmcdb.org/data/idus_view?xh=so";

class Legend extends React.Component {
  state = {
    collapsed: false
  };
  toggleCollapse() {
    this.setState({
      collapsed: !this.state.collapsed
    });
  }
  render() {
    return (
      <div
        id="legend"
        className={this.state.collapsed ? "legend-closed" : "legend-open"}
      >
        <h1 onClick={() => this.toggleCollapse()}>
          Internal Displacement Updates&nbsp;
          {this.state.collapsed && <i className="fa fa-caret-down" />}
          {!this.state.collapsed && <i className="fa fa-caret-up" />}
        </h1>
        {!this.state.collapsed && (
          <React.Fragment>
            <ul>
              <li>
                <span className="dot conflict" />
                <span className="text">&nbsp;Conflict</span>
              </li>
              <li>
                <span className="dot disaster" />
                <span className="text">&nbsp;Disaster</span>
              </li>
              <li>
                <span className="dot development" />
                <span className="text">&nbsp;Development</span>
              </li>
            </ul>
            <p>
              This map displays all displacement events recorded by IDMC that
              have ocurred in the past 30 days.
            </p>
          </React.Fragment>
        )}
      </div>
    );
  }
}

class App extends React.Component {
  componentDidMount() {
    this.setupMapbox();
    this.loadMapboxData();
  }
  render() {
    return (
      <div id="wrapper">
        <div id="inner-wrapper">
          <div id="map" />
          <Legend />
        </div>
      </div>
    );
  }

  setupMapbox() {
    mapboxgl.accessToken = mapboxToken;
    this.map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/idmcda/cjasa8fvu6hp92spaeobt52k6",
      center: [0, 0],
      zoom: 2
    });
  }

  loadMapboxData() {
    fetch(idmcUrl)
      .then(resp => resp.json())
      .then(data => this.addDataToMap(data))
      .catch(err => console.log(err));
  }

  addDataToMap(data) {
    console.log(data);
    const features = data.features;
    const featuresByType = {
      disaster: data.features.filter(
        f => f.properties.displacement_type === "Disaster"
      ),
      conflict: data.features.filter(
        f => f.properties.displacement_type === "Conflict"
      ),
      development: data.features.filter(
        f => f.properties.displacement_type === "Development"
      )
    };
    console.log(featuresByType);
    for (const type in featuresByType) {
      const features = featuresByType[type];
      console.log(features);
      this.addEventTypeLayerWithData(type, features);
      this.registerLayerClickHandler(type);
      this.registerLayerHoverHandler(type);
    }
  }

  addEventTypeLayerWithData(layerName, features) {
    this.map.addLayer({
      id: layerName,
      source: {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: features
        }
      },
      type: "circle",
      paint: {
        "circle-radius": 10,
        "circle-color": layerColours[layerName]
      }
    });
  }
  registerLayerClickHandler(layerName) {
    this.map.on("click", layerName, e => {
      const feature = e.features[0];
      const event = feature.properties;
      const html = event.standard_popup_text_grouped;
      const coordinates = feature.geometry.coordinates;

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(html)
        .addTo(this.map);
    });
  }
  registerLayerHoverHandler(layerName) {
    this.hoverPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    this.map.on("mouseenter", layerName, e => {
      this.map.getCanvas().style.cursor = "pointer";

      const feature = e.features[0];
      const event = feature.properties;
      const html = event.standard_info_text_grouped;
      const coordinates = feature.geometry.coordinates;

      this.hoverPopup
        .setLngLat(coordinates)
        .setHTML(html)
        .addTo(this.map);
    });

    this.map.on("mouseleave", layerName, () => {
      this.map.getCanvas().style.cursor = "";
      this.hoverPopup.remove();
    });
  }
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
