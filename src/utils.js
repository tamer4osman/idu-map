export const eventHasLatitudeAndLongitude = event =>
  event.latitude && event.longitude;
export const eventToLatLng = event =>
  event.latitude.toString() + event.longitude.toString();
export const eventToTypeLatLng = event =>
  event.displacement_type + eventToLatLng(event);
export const eventLatLngSortComparer = (event1, event2) => {
  const latLng1 = eventToTypeLatLng(event1);
  const latLng2 = eventToTypeLatLng(event2);
  return latLng1 - latLng2;
};
export const mergeEventsWithSameCoordsAndTypeReducer = (acc, curr) => {
  const last = acc[acc.length - 1];
  if (!last) return [curr];
  const lastTypeLatLng = eventToTypeLatLng(last);
  const currTypeLatLng = eventToTypeLatLng(curr);
  if (lastTypeLatLng === currTypeLatLng) {
    last.standard_info_text += curr.standard_info_text;
    last.standard_popup_text += curr.standard_popup_text;
    last.standard_popup_text += curr.figure;
  } else {
    acc.push(curr);
  }
  return acc;
};
export const markEventsWithSameCoordsForOffsetReducer = (acc, curr) => {
  const last = acc[acc.length - 1];
  if (!last) return [curr];
  const lastLatLng = eventToLatLng(last);
  const currLatLng = eventToLatLng(curr);
  if (lastLatLng === currLatLng) {
    curr.offsetFactor = true;
  }
  acc.push(curr);
  return acc;
};

export const mapDataToGeoJson = results => ({
  type: "FeatureCollection",
  features: results.map(item => {
    return {
      type: "Feature",
      properties: {
        descriptionPop: item.standard_popup_text,
        descriptionHover: item.standard_info_text,
        circleColor: item.displacement_type,
        circleRadius: item.figure,
        figure: item.figure
      },
      geometry: {
        type: "Point",
        coordinates: [item.longitude, item.latitude]
      }
    };
  })
});
