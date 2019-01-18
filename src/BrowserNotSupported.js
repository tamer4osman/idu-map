import React from "react";
import backgroundImg from './assets/screenshot-blurred-rendered-map-2018-12-28.png';

export const BrowserNotSupported = () => (
  <div
    style={{
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundImage: `url(${backgroundImg})`,
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
          display: 'table',
          width: '100%',
          height: '100%',
        }}
      >
        <div
          style={{
            display: 'table-cell',
            verticalAlign: 'middle',
            textAlign: 'center',
            fontFamily: "Lato",
            fontSize: "2em"
          }}
        >
          Your browser is not supported. Please use an up-to-date browser to view this map.
        </div>
      </div>
  </div>
);
