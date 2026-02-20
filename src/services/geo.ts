import * as geofire from 'geofire-common';

export const getGeohash = (lat: number, lng: number): string => {
    return geofire.geohashForLocation([lat, lng]);
};

export const getQueryBounds = (centerLat: number, centerLng: number, radiusKm: number) => {
    return geofire.geohashQueryBounds([centerLat, centerLng], radiusKm * 1000);
};

export const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    return geofire.distanceBetween([lat1, lng1], [lat2, lng2]);
};
