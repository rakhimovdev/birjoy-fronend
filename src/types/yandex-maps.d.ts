type YandexMapCoords = [number, number];
type YandexMapBounds = [YandexMapCoords, YandexMapCoords];

interface YMapsEvent<T = unknown> {
  get(name: string): T;
}

interface YMapsEventManager {
  add(type: string, handler: (event: YMapsEvent) => void): void;
  remove(type: string, handler: (event: YMapsEvent) => void): void;
}

interface YMapsOptionManager {
  set(name: string, value: unknown): void;
}

interface YMapsPropertyManager {
  get<T = unknown>(name: string): T;
  set(name: string, value: unknown): void;
}

interface YMapsGeometry {
  getCoordinates(): YandexMapCoords;
  setCoordinates(coordinates: YandexMapCoords): void;
}

interface YMapsGeoObject {
  events: YMapsEventManager;
  geometry: YMapsGeometry;
  options: YMapsOptionManager;
  properties: YMapsPropertyManager;
}

interface YMapsGeoObjectCollection {
  add(object: YMapsGeoObject): void;
  remove(object: YMapsGeoObject): void;
}

interface YMapsMap {
  container: {
    fitToViewport: () => void;
  };
  geoObjects: YMapsGeoObjectCollection;
  events: YMapsEventManager;
  setCenter(coordinates: YandexMapCoords, zoom?: number, options?: Record<string, unknown>): void;
  setZoom(zoom: number, options?: Record<string, unknown>): void;
  getZoom(): number;
  panTo(coordinates: YandexMapCoords, options?: Record<string, unknown>): Promise<unknown> | void;
  setBounds(bounds: YandexMapBounds, options?: Record<string, unknown>): Promise<unknown> | void;
  destroy(): void;
}

interface YMapsPlacemark extends YMapsGeoObject {}

interface YMapsCircle extends YMapsGeoObject {}

interface YMapsGeocodeGeoObject {
  geometry: YMapsGeometry;
  properties: YMapsPropertyManager;
  getAddressLine?: () => string;
  getAdministrativeAreas?: () => string[];
  getCountry?: () => string;
  getLocalities?: () => string[];
  getPremise?: () => string;
  getPremiseNumber?: () => string;
  getThoroughfare?: () => string;
}

interface YMapsGeoObjectList<T> {
  each(callback: (item: T) => void): void;
  get(index: number): T | undefined;
  getBounds?(): YandexMapBounds | null;
  getLength(): number;
}

interface YMapsGeocodeResponse {
  geoObjects: YMapsGeoObjectList<YMapsGeocodeGeoObject>;
}

type YMapsLayoutClass = new (...args: never[]) => unknown;

interface YMapsTemplateLayoutFactory {
  createClass(template: string): YMapsLayoutClass;
}

interface YMapsApi {
  Map: new (
    element: HTMLElement,
    state: {
      center: YandexMapCoords;
      zoom: number;
      controls?: string[];
    },
    options?: Record<string, unknown>
  ) => YMapsMap;
  Placemark: new (
    coordinates: YandexMapCoords,
    properties?: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => YMapsPlacemark;
  Circle: new (
    geometry: [YandexMapCoords, number],
    properties?: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => YMapsCircle;
  geocode(
    request: string | YandexMapCoords,
    options?: Record<string, unknown>
  ): Promise<YMapsGeocodeResponse>;
  ready(callback: () => void): void;
  templateLayoutFactory: YMapsTemplateLayoutFactory;
}

interface Window {
  ymaps?: YMapsApi;
}
