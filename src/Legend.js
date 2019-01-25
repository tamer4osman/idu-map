import React from "react";

import {
  IDMC_COLOR_CONFLICT,
  IDMC_COLOR_DISASTER,
  IDMC_COLOR_DEVELOPMENT,
  CIRCLE_RADIUS_SMALL_FIGURE,
  CIRCLE_RADIUS_MEDIUM_FIGURE,
  CIRCLE_RADIUS_LARGE_FIGURE
} from "./config";

export const Legend = ({
  displacementTypeFilters,
  onLastXDaysFilterChange,
  onDisplacementTypeChange,
  onSizeFilterChange,
  sizeFilters
}) => {
  const circleStyle = margin => (radius, active, color = "black") => ({
    backgroundColor: active ? color : "lightgray",
    width: radius * 2,
    height: radius * 2,
    display: "inline-block",
    borderRadius: "50%",
    alignSelf: "center",
    margin: margin
  });
  const displacementCircle = circleStyle("0 5px 0 0");
  const sizeCircle = circleStyle("0 0 0 5px");
  const textStyle = active => ({
    color: active ? "black" : "grey",
    alignSelf: "center"
  });

  const conflictCircleStyle = displacementCircle(
    9,
    displacementTypeFilters.Conflict,
    IDMC_COLOR_CONFLICT
  );
  const conflictTextStyle = textStyle(displacementTypeFilters.Conflict);

  const disasterCircleStyle = displacementCircle(
    9,
    displacementTypeFilters.Disaster,
    IDMC_COLOR_DISASTER
  );
  const disasterTextStyle = textStyle(displacementTypeFilters.Disaster);

  const developmentCircleStyle = displacementCircle(
    9,
    displacementTypeFilters.Development,
    IDMC_COLOR_DEVELOPMENT
  );
  const developmentTextStyle = textStyle(displacementTypeFilters.Development);

  const smallCircle = sizeCircle(CIRCLE_RADIUS_SMALL_FIGURE, sizeFilters.small);
  const smallCircleTextStyle = textStyle(sizeFilters.small);

  const mediumCircle = sizeCircle(
    CIRCLE_RADIUS_MEDIUM_FIGURE,
    sizeFilters.medium
  );
  const mediumCircleTextStyle = textStyle(sizeFilters.medium);

  const largeCircle = sizeCircle(CIRCLE_RADIUS_LARGE_FIGURE, sizeFilters.large);
  const largeCircleTextStyle = textStyle(sizeFilters.large);

  const styleLegendOuterWrapper = {
    width: "290px",
    position: "absolute",
    boxShadow: "- 2px -3px 5px rgba(170, 132, 132, 0.3)",
    boxSizing: "border-box",
    backgroundColor: "#fff",
    borderRadius: "3px",
    bottom: "30px",
    fontSize: "12px / 20px",
    padding: "0 10px 10px 10px",
    left: "20px",
    zIndex: 1
  };
  const styleLegendInnerWrapper = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between"
  };
  const styleLegend = {
    display: "flex",
    flexDirection: "column"
  };
  const styleLegendSecond = Object.assign({}, styleLegend, {
    alignItems: "flex-end"
  });
  const styleLegendItem = {
    display: "flex",
    flexDirection: "row",
    marginBottom: "5px"
  };
  const styleLegendItemSecond = Object.assign({}, styleLegendItem, {
    marginBottom: "5px"
  });

  return (
    <div style={styleLegendOuterWrapper}>
      <p style={{ fontSize: "12px" }}>
        This map displays all displacement events recorded by IDMC that have
        ocurred in the past six months.
      </p>
      <div id="list">
        <select onChange={e => onLastXDaysFilterChange(e)} defaultValue="30">
          <option value="180">Show data from last 180 days</option>
          <option value="90">Show data from last 90 days</option>
          <option value="30">Show data from last 30 days</option>
          <option value="15">Show data from last 15 days</option>
          <option value="7">Show data from last 7 days</option>
        </select>
      </div>
      <br />
      <div style={styleLegendInnerWrapper}>
        <div style={styleLegend}>
          <button
            style={styleLegendItem}
            type="button"
            onClick={() => onDisplacementTypeChange("Conflict")}
          >
            <div style={conflictCircleStyle} />
            <div style={conflictTextStyle}>Conflict</div>
          </button>

          <button
            style={styleLegendItem}
            type="button"
            onClick={() => onDisplacementTypeChange("Disaster")}
          >
            <div style={disasterCircleStyle} />
            <div style={disasterTextStyle}>Disaster</div>
          </button>

          <button
            type="button"
            style={styleLegendItem}
            onClick={() => onDisplacementTypeChange("Development")}
          >
            <div style={developmentCircleStyle} />
            <div style={developmentTextStyle}>Development</div>
          </button>
        </div>
        <div style={styleLegendSecond}>
          <button
            style={styleLegendItemSecond}
            type="checkbox"
            onClick={() => onSizeFilterChange("small")}
          >
            <div style={smallCircleTextStyle}>Less than 100</div>
            <div style={smallCircle} />
            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
          </button>
          <button
            style={styleLegendItemSecond}
            type="button"
            onClick={() => onSizeFilterChange("medium")}
          >
            <div style={mediumCircleTextStyle}>Between 100 and 1000</div>
            <div style={mediumCircle} />
            <div>&nbsp;&nbsp;&nbsp;</div>
          </button>

          <button
            type="button"
            style={styleLegendItemSecond}
            onClick={() => onSizeFilterChange("large")}
          >
            <div style={largeCircleTextStyle}>More than 1000</div>
            <div style={largeCircle} />
          </button>
        </div>
      </div>
      <p style={{ fontSize: "10px", marginBottom: "0px", color: "grey" }}>
        Developed by students at{" "}
        <a href="https://www.redi-school.org/" target="_blank">
          ReDI School
        </a>
        .
      </p>
    </div>
  );
};
