import flow from 'lodash/fp/flow'
import groupBy from 'lodash/fp/groupBy'
import filter from 'lodash/fp/filter'
import transform from 'lodash/fp/transform'
import map from 'lodash/fp/map'
import join from 'lodash/fp/join'
import sum from 'lodash/fp/sum'
import flatten from 'lodash/fp/flatten'
import pick from 'lodash/fp/pick'

export const eventHasLatitudeAndLongitude = event =>
    event.latitude && event.longitude;
export const eventToLatLng = event =>
    event.latitude.toString() + event.longitude.toString();
export const eventToTypeLatLng = event =>
    event.displacement_type + eventToLatLng(event);

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
        coordinates: [ item.longitude, item.latitude ]
      }
    };
  })
});

const mergeEvents = (events) => {
  const singleEvent = {
    ...events[ 0 ]
  };
  singleEvent.standard_info_text = flow(
      map(e => e.standard_info_text),
      join(''),
  )(events);
  singleEvent.standard_popup_text = flow(
      map(e => e.standard_popup_text),
      join('<br /><br />'),
  )(events);
  singleEvent.figure = flow(
      map(e => e.figure),
      sum,
  )(events);
  return singleEvent
};

export const rawDataToOffsetGrouped = rawData => {
  let { single: eventsWithUniqueCoords, multiple: eventsWithSharedCoords } = flow(
      map(v => pick([ 'latitude', 'longitude', 'displacement_type', 'figure', 'standard_info_text', 'standard_popup_text', 'displacement_date', 'displacement_start_date' ])(v)),
      filter(eventHasLatitudeAndLongitude),
      groupBy(eventToTypeLatLng),
      transform((acc, v) => {
        acc[ v.length > 1 ? 'multiple' : 'single' ].push(...v);
      }, { single: [], multiple: [] })
  )(rawData);

  const eventsWithSharedCoordsMergedAndOffsetMarked = flow(
      groupBy(eventToTypeLatLng),
      map(mergeEvents),
      groupBy(eventToLatLng),
      map(eventsAtSameCoords =>
          eventsAtSameCoords.map((v, i) => Object.assign(v, { offsetFactor: i }))
      ),
      flatten,
  )(eventsWithSharedCoords);
  const all = [
    ...eventsWithUniqueCoords.map(e => Object.assign(e, { offsetFactor: 0 })),
    ...eventsWithSharedCoordsMergedAndOffsetMarked
  ];
  return groupBy('offsetFactor', all)
};
