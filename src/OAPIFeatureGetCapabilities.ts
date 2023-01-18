export interface OAPIFeatureCapabilitiesObject {
  name: string;
  featureTypes: OAPIFeatureCapabilitiesFeatureType[];
  version: string;
  service: string;
  info: any;
  crs?: any[];
  hostUrl: string;
}

export interface OAPIFeatureCapabilitiesFeatureType {
  id: string;
  name: string;
  title: string;
  defaultReference: string;
  outputFormats: string[];
  description: string;
  keywords: string[];
  links: OAPIFeatureServiceLinkType[];
  extent: any;
  crs?: any;
  storageCrs?: any;
}

export interface OAPIFeatureServiceLinkType {
  rel: string;
  type: string;
  title: string;
  href: string;
}

export enum CollectionLinkType {
  Items = 'items',
}

interface FetchLinkContentOptions {
  hostUrl: string;
  credentials?: boolean;
  requestHeaders?: {
    [headerName: string]: string;
  } | null;
}

export interface OptionsOAPIFeatureGetCapabilitiesFromURL {
  filterCollectionsByLinkType?: CollectionLinkType
  credentials?: boolean;
  requestHeaders?: {
    [headerName: string]: string;
  } | null;
}

// type ProxifierFunction = (s: string) => string;
type ProxifierFunction = (options: {
  indexes: { [key: string]: string };
  useProxy: boolean;
  requestHeaders?: { [key: string]: string };
}) => { urls: { [key: string]: string }; headers: { [key: string]: string } };

export class OAPIFeatureGetCapabilities {
  private static proxify: ProxifierFunction | undefined;
  public static setProxifier(f: ProxifierFunction) {
    this.proxify = f;
  }

  public static resetProxifier() {
    this.proxify = undefined;
  }

  public static Proxify(options: {
    indexes: { [key: string]: string };
    useProxy: boolean;
    requestHeaders?: { [key: string]: string };
  }) {
    if (typeof this.proxify === 'function') {
      return this.proxify(options);
    } else {
      return { urls: options.indexes, headers: options.requestHeaders ? options.requestHeaders : {} };
    }
  }

  public static hasProxy() {
    return typeof OAPIFeatureGetCapabilities.proxify === 'function';
  }
  public static fromURL(inputRequest: string, options?: OptionsOAPIFeatureGetCapabilitiesFromURL) {
    return new Promise<OAPIFeatureCapabilitiesObject>((resolve, reject) => {
      const hostUrl = OAPIFeatureGetCapabilities.getHostURL(inputRequest);
      const MyProxy = OAPIFeatureGetCapabilities.Proxify({
        indexes: { getcapabilities: inputRequest },
        useProxy: OAPIFeatureGetCapabilities.hasProxy(),
        requestHeaders: options.requestHeaders
      });
      fetch(MyProxy.urls.getcapabilities, {
        method: 'GET',
        credentials: options.credentials ? "same-origin" : "omit",
        headers: MyProxy.headers,
      }).then(
        (response) => {
          if (response.status === 200) {
            response.json().then((jsonObject) => {
              if (!jsonObject.links) {
                reject("Invalid format: (property 'links' is missing)")
                return;
              }
              let linkToData = jsonObject.links.find(
                (link: OAPIFeatureServiceLinkType) =>
                  link.rel === 'data' && link.type === 'application/json'
              );
              if (!linkToData)  {
                linkToData = jsonObject.links.find((link) => link.rel === 'data' );
              }
              const linkToApi = jsonObject.links.find(
                (link: OAPIFeatureServiceLinkType) => {
                  return (
                    (link.rel === 'service-desc' || link.rel === 'service') &&
                    link.type.indexOf('openapi+json') > -1
                  );
                }
              );
              const promiseArray = [];
              if (linkToData) {
                const collectionsPromise = OAPIFeatureGetCapabilities.fetchLinkContentAsJSON(
                  linkToData,
                    {hostUrl}
                );
                promiseArray.push(collectionsPromise);
                if (linkToApi) {
                  const apiPromise = OAPIFeatureGetCapabilities.fetchLinkContentAsJSON(
                    linkToApi,
                      {hostUrl}
                  );
                  promiseArray.push(apiPromise);
                }
                Promise.all(promiseArray).then((responses: any) => {
                  const responseDataLink = responses[0];
                  const responseOpenApi =
                    responses.length >= 1 ? responses[1] : undefined;
                  const crsArray = typeof responseDataLink.crs !== "undefined" ? { crs: responseDataLink.crs } : {};
                  const featureTypes = responseDataLink.collections.filter(c=> options && options.filterCollectionsByLinkType ? OAPIFeatureGetCapabilities.filterCollectionLinks(c.links,options.filterCollectionsByLinkType).length>0 : true).map(
                    (collection: any) => {
                      const name =
                        typeof collection.id !== 'undefined'
                          ? collection.id
                          : collection.name;
                      const collectionCrsObject = {} as any;
                      if (typeof collection.crs !== "undefined") collectionCrsObject.crs = collection.crs;
                      if (typeof collection.storageCrs !== "undefined") collectionCrsObject.storageCrs = collection.storageCrs;
                      const layer: OAPIFeatureCapabilitiesFeatureType = {
                        description: collection.description,
                        id: name,
                        name,
                        title: collection.title,
                        keywords: collection.keywords
                          ? collection.keywords
                          : [],
                        defaultReference: 'CRS:84',
                        links: collection.links,
                        outputFormats: collection.links
                          .filter(
                            (link: any) =>
                              link.rel === 'items' || link.rel === 'item'
                          )
                          .map((link: any) => link.type),
                        extent: collection.extent,
                        ...collectionCrsObject
                      };
                      return layer;
                    }
                  );
                  // console.log(featureTypes);
                  const o: OAPIFeatureCapabilitiesObject = {
                    name: '',
                    featureTypes: featureTypes,
                    version: responseOpenApi ? responseOpenApi.openapi : '',
                    service: '',
                    info: responseOpenApi ? responseOpenApi.info : {},
                    ...crsArray,
                    hostUrl,
                  };
                  resolve(o);
                });
              } else {
                reject("Invalid format: (property 'links' contains no links with rel=data");
              }
            }, ()=>{
              reject("Not JSON")
            });
          } else {
            reject(response.status);
          }
        },
        (err) => {
          reject(err);
        }
      );
    });
  }

  protected static getHostURL(fullUrl: string) {
    if (!fullUrl.startsWith("http")) return "";
      const pathArray = fullUrl.split( '/' );
      const protocol = pathArray[0];
      const host = pathArray[2];
      return protocol + '//' + host;
  }

  public static addHostURL(url: string, HostUrl?: string) {
    const hostUrl = HostUrl ? HostUrl : "";
    if (url.startsWith("http://") ||  url.startsWith("https://")) {
      return url;
    } else {
      if (url.startsWith("/")) return hostUrl + url;
    }
    return hostUrl + "/" + url;
  }

  private static fetchLinkContentAsJSON(link: OAPIFeatureServiceLinkType, options?: FetchLinkContentOptions) {
    return new Promise((resolve) => {
      const MyProxy = OAPIFeatureGetCapabilities.Proxify({
        requestHeaders: options.requestHeaders,
        useProxy: OAPIFeatureGetCapabilities.hasProxy(),
        indexes: { link: OAPIFeatureGetCapabilities.addHostURL(link.href, options?.hostUrl) },
      });
      fetch(MyProxy.urls.link, {
        method: 'GET',
        credentials: options.credentials ? "same-origin" : "omit",
        headers: MyProxy.headers,
      }).then(
        (result) => {
          if (result.status === 200) {
            result.json().then((json) => resolve(json));
          } else {
            resolve(undefined);
          }
        },
        () => {
          resolve(undefined);
        }
      );
    });
  }

  static filterCollectionLinks(
    links: OAPIFeatureServiceLinkType[],
    linkType: CollectionLinkType
  ) {
    switch (linkType) {
      case CollectionLinkType.Items:
        return links.filter(
          (link: any) => link.rel === 'items' || link.rel === 'item'
        );
    }
  }

  public static getDataLink(
    currentLayer: OAPIFeatureCapabilitiesFeatureType,
    preferedFormat: string
  ) {
    const dataLink = OAPIFeatureGetCapabilities.filterCollectionLinks(
      currentLayer.links,
      CollectionLinkType.Items
    ).find((link) => link.type === preferedFormat);
    return dataLink ? dataLink.href : '';
  }
}
