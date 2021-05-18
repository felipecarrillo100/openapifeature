export interface OAPIFeatureCapabilitiesObject {
  name: string;
  featureTypes: OAPIFeatureCapabilitiesFeatureType[];
  version: string;
  service: string;
  info: any;
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
      return { urls: options.indexes, headers: {} };
    }
  }

  public static hasProxy() {
    return typeof OAPIFeatureGetCapabilities.proxify === 'function'
      ? true
      : false;
  }
  public static fromURL(inputRequest: string, options: any) {
    console.log(options);
    return new Promise<OAPIFeatureCapabilitiesObject>((resolve, reject) => {
      const MyProxy = OAPIFeatureGetCapabilities.Proxify({
        indexes: { getcapabilities: inputRequest },
        useProxy: OAPIFeatureGetCapabilities.hasProxy(),
      });
      fetch(MyProxy.urls.getcapabilities, {
        method: 'GET',
        headers: MyProxy.headers,
      }).then(
        (response) => {
          if (response.status === 200) {
            response.json().then((jsonObject) => {
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
                  linkToData
                );
                promiseArray.push(collectionsPromise);
                if (linkToApi) {
                  const apiPromise = OAPIFeatureGetCapabilities.fetchLinkContentAsJSON(
                    linkToApi
                  );
                  promiseArray.push(apiPromise);
                }
                Promise.all(promiseArray).then((responses: any) => {
                  const responseDataLink = responses[0];
                  const responseOpenApi =
                    responses.length >= 1 ? responses[1] : undefined;
                  const featureTypes = responseDataLink.collections.map(
                    (collection: any) => {
                      const name =
                        typeof collection.id !== 'undefined'
                          ? collection.id
                          : collection.name;
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
                      };
                      return layer;
                    }
                  );
                  console.log(featureTypes);
                  const o: OAPIFeatureCapabilitiesObject = {
                    name: '',
                    featureTypes: featureTypes,
                    version: responseOpenApi ? responseOpenApi.openapi : '',
                    service: '',
                    info: responseOpenApi ? responseOpenApi.info : {},
                  };
                  resolve(o);
                });
              }
            });
          } else {
            reject();
          }
        },
        () => {
          reject();
        }
      );
    });
  }

  public static getServiceOperation(
    s: OAPIFeatureCapabilitiesObject,
    options: any
  ) {
    console.log(s);
    console.log(options);
  }

  private static promiseToLink(link: OAPIFeatureServiceLinkType) {
    return OAPIFeatureGetCapabilities.fetchLinkContentAsJSON(link);
  }

  private static fetchLinkContentAsJSON(link: OAPIFeatureServiceLinkType) {
    return new Promise((resolve) => {
      const MyProxy = OAPIFeatureGetCapabilities.Proxify({
        useProxy: OAPIFeatureGetCapabilities.hasProxy(),
        indexes: { link: link.href },
      });
      fetch(MyProxy.urls.link, {
        method: 'GET',
        headers: MyProxy.headers,
      }).then(
        (result) => {
          if (result.status === 200) {
            result.json().then((json) => resolve(json));
          } else {
            resolve();
          }
        },
        () => {
          resolve();
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
        break;
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
