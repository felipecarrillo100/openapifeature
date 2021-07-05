import { Store } from '@luciad/ria/model/store/Store';
import { Cursor } from '@luciad/ria/model/Cursor';
import { Feature } from '@luciad/ria/model/feature/Feature';
import { Evented, Handle } from '@luciad/ria/util/Evented';
import { Bounds } from '@luciad/ria/shape/Bounds';
import {Codec, CodecDecodeOptions} from '@luciad/ria/model/codec/Codec';
import { EventedSupport } from '@luciad/ria/util/EventedSupport';
import { createBounds } from '@luciad/ria/shape/ShapeFactory';
import { CoordinateReference } from '@luciad/ria/reference/CoordinateReference';

interface WFS3FeatureStoreConstructorOptions {
  dataUrl: string;
  dataFormat: string;
  outputFormat: string;
  codec: Codec;
  requestHeaders: { [key: string]: string };
  tmp_reference: string;
  extent: { spatial: { bbox: any[] } };
  reference: CoordinateReference;
}

interface OAPICodecDecodeOptions extends CodecDecodeOptions {
  contentCrs?: string;
  contentLength?: number;
}

export class OAPIFeatureStore implements Store, Evented {
  private dataUrl: string;
  private codec: Codec;
  private eventedSupport: EventedSupport;
  private baseUrl: string;
  private dataFormat: string | undefined;
  private bounds: Bounds;
  private requestHeaders: { [key: string]: string };
  private reference: CoordinateReference;
  private outputFormat: string;

  constructor(options: WFS3FeatureStoreConstructorOptions) {
    console.log(options);
    this.dataUrl = options.dataUrl;
    this.outputFormat = options.outputFormat;
    this.baseUrl = OAPIFeatureStore.cleanUrl(this.dataUrl);
    this.dataFormat = OAPIFeatureStore.dataFormatInQuery(this.dataUrl);
    this.codec = options.codec;
    this.eventedSupport = new EventedSupport();
    this.requestHeaders = options.requestHeaders ? options.requestHeaders : {};
    this.reference = options.reference;
    if (
      options.extent &&
      options.extent.spatial &&
      options.extent.spatial.bbox &&
      options.extent.spatial.bbox.length > 0
    ) {
      const bbox = options.extent.spatial.bbox[0];
      console.log(options.extent.spatial);
      this.bounds = createBounds(this.reference, [
        bbox[0],
        bbox[2] - bbox[0],
        bbox[1],
        bbox[3] - bbox[1],
      ]);
    }
  }

  on(event: string, callback: any, context: any, options: any): Handle {
    return this.eventedSupport.on(event, callback, context, options);
  }

  get(id: number | string, optionsInput?: any): Promise<Feature> {
    return new Promise((resolve) => {
      const options = optionsInput ? { ...optionsInput } : {};
      options.query = options.query ? options.query : {};
      options.query.f = options.query.f ? options.query.f : this.dataFormat;
      // Mod starta
      const itemsAccept =
        typeof this.requestHeaders.accept !== 'undefined'
          ? this.requestHeaders.accept.split(';')
          : typeof this.requestHeaders.Accept !== 'undefined'
          ? this.requestHeaders.Accept.split(';')
          : [];
      itemsAccept.push(this.outputFormat);
      const accept = itemsAccept.join(';');
      // Mod end
      const request = options.query.f
        ? this.baseUrl + id + '?f=' + options.query.f
        : this.baseUrl + id;
      const headers = { ...this.requestHeaders, Accept: accept };
      fetch(request, {
        method: 'GET',
        headers,
      }).then((response) => {
        if (response.status === 200) {
          response.text().then((content) => {
            let contentType = response.headers.get('Content-Type');
            const contentCrs = response.headers.get('content-crs');
            const contentLengthStr = response.headers.get('Content-Length');
            const contentLength = Number(contentLengthStr);
            contentType = contentType ? contentType : 'text/plain';
            content = content
              .split('http://www.opengis.net/def/crs/OGC/1.3/CRS84')
              .join('urn:ogc:def:crs:OGC:1.3:CRS84');
            const codecOptions: OAPICodecDecodeOptions = {
              content, contentType, contentCrs, contentLength
            };
            const cursor = this.codec.decode(codecOptions);
            if (cursor.hasNext()) {
              const feaure = cursor.next();
              resolve(feaure);
            } else {
              resolve();
            }
          });
        }
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  query(receivedQuery?: any, options?: any): Cursor | Promise<Cursor> {
    return new Promise((resolve) => {
      const query = receivedQuery ? { ...receivedQuery } : {};
      query.f = query.f ? query.f : this.dataFormat;
      query.limit = query.limit ? query.limit : undefined;
      let request = this.baseUrl;
      // Mod starta
      const itemsAccept =
        typeof this.requestHeaders.accept !== 'undefined'
          ? this.requestHeaders.accept.split(';')
          : typeof this.requestHeaders.Accept !== 'undefined'
          ? this.requestHeaders.Accept.split(';')
          : [];
      itemsAccept.push(this.outputFormat);
      const accept = itemsAccept.join(';');
      // Mod end
      let queryCharacter = '?';
      if (query.f) {
        request += queryCharacter + 'f=' + query.f;
        queryCharacter = '&';
      }
      if (query.limit) {
        request += queryCharacter + 'limit=' + query.limit;
        queryCharacter = '&';
      }
      if (query.bbox) {
        request += queryCharacter + 'bbox=' + query.bbox;
        queryCharacter = '&';
      }
      const headers = { ...this.requestHeaders, Accept: accept };
      // const headers = { ...this.requestHeaders };
      fetch(request, {
        method: 'GET',
        headers,
      }).then((response) => {
        if (response.status === 200) {
          response.text().then((content) => {
            let contentType = response.headers.get('Content-Type');
            const contentCrs = response.headers.get('content-crs');
            const contentLengthStr = response.headers.get('Content-Length');
            const contentLength = Number(contentLengthStr);
            contentType = contentType ? contentType : 'text/plain';
            content = content
              .split('srsName="http://www.opengis.net/def/crs/OGC/1.3/CRS84"')
              .join('srsName="urn:ogc:def:crs:OGC:1.3:CRS84"');
            const codecOptions: OAPICodecDecodeOptions = {
              content, contentType, contentCrs, contentLength
            };
            const cursor = this.codec.decode(codecOptions);
            resolve(cursor);
          });
        }
      });
    });
  }

  spatialQuery(
    bounds?: Bounds,
    receivedQuery?: any,
    options?: any
  ): Promise<Cursor> | Cursor {
    const query = receivedQuery ? { ...receivedQuery } : {};
    delete query.bbox;
    query.limit = query.limit ? query.limit : undefined;
    if (bounds) {
      query.bbox = query.bbox
        ? query.bbox
        : [
            bounds.x,
            bounds.y,
            bounds.x + bounds.width,
            bounds.y + bounds.height,
          ].join(',');
    }
    return this.query(query, options);
  }

  private static cleanUrl(dataUrl: string) {
    const parts = dataUrl.split('?');
    const cleanUrl = parts[0].endsWith('/') ? parts[0] : parts[0] + '/';
    return cleanUrl;
  }

  private static dataFormatInQuery(dataUrl: string) {
    let format;
    const parts = dataUrl.split('?');
    if (parts.length > 1) {
      const query = parts[1];
      const qs = query.split('&');
      for (const q of qs) {
        if (q.startsWith('f=')) {
          format = q.substr(2);
          return format;
        }
      }
    }
    return format;
  }
}

export {
  OAPICodecDecodeOptions
}
