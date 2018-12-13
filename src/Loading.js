import React from "react";

export const Loading = () => (
  <div
    style={{
      backgroundColor: "rgba(255, 255, 255, 0.7)",
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: 9999
    }}
  >
    <div
      style={{
        position: "absolute",
        top: "49%",
        left: "45%",
        fontFamily: "Lato",
        fontSize: "2em"
      }}
    >
      Loading...
    </div>
  </div>
);
