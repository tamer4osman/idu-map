Following loading from the IDMC backend (https://backend.idmcdb.org/data/idus_view_flat), and before rendering on the map, all events are preprocessed in three steps:

1. All events without coordinates (latitude and longitude) are removed
2. All events with the same coordinates **and** displacement_type (e.g. 12.34, 45.67 and 'Disaster') are merged.
3. At this step, any events sharing the same coordinates will have **different** ***displacement_type***. The first such event is assigned an offsetFactor of 0, the second one an offsetFactor of 1, the third one an offsetFactor of 2, and so forth.

When rendered, events with an offsetFactor will be offset by [x, y] pixels, where  x = CIRCLE_HORIZONTAL_PIXEL_OFFSET_ON_EVENTS_WITH_SAME_TYPE_AND_SAME_COORDINATES * offsetFactor, and y = CIRCLE_VERTICAL_PIXEL_OFFSET_ON_EVENTS_WITH_SAME_TYPE_AND_SAME_COORDINATES * offsetFactor. Update config.js to change the pixel offset constants.

Step #3 represent an edge case that does not occur frequently. To test it, insert the below code into `utils.js`, function `rawDataToOffsetGrouped`, before the line with `const eventsWithSharedCoordsMergedAndOffsetMarked`:

```
eventsWithSharedCoords[ 1 ].latitude = eventsWithSharedCoords[ 0 ].latitude
eventsWithSharedCoords[ 1 ].longitude = eventsWithSharedCoords[ 0 ].longitude
eventsWithSharedCoords[ 1 ].displacement_type = eventsWithSharedCoords[ 0 ].displacement_type = "Conflict";
eventsWithSharedCoords[ 0 ].standard_info_text = '0000';
eventsWithSharedCoords[ 1 ].standard_info_text = '1111';
eventsWithSharedCoords[ 2 ].latitude = eventsWithSharedCoords[ 3 ].latitude = eventsWithSharedCoords[ 0 ].latitude
eventsWithSharedCoords[ 2 ].longitude = eventsWithSharedCoords[ 3 ].longitude = eventsWithSharedCoords[ 0 ].longitude
eventsWithSharedCoords[ 3 ].displacement_type = eventsWithSharedCoords[ 2 ].displacement_type = "Disaster";
eventsWithSharedCoords[ 3 ].standard_info_text = '3333';
eventsWithSharedCoords[ 2 ].standard_info_text = '2222';
eventsWithUniqueCoords = [];
eventsWithSharedCoords = eventsWithSharedCoords.splice(0, 4)
```

To update the merge mechanism, update function `mergeEvents` in `utils.js`.
