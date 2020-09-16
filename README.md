# OPEN API Feature prototype for LuciadRIA 

## Description
The openapifeature package provides OGC API Feature functionality to LuciadRIA Application

The Main React Components are:

* OAPIFeatureStore  a ready to use store capable to retrieve features from an OGC API Service   
* OAPIFeatureGetCapabilities a helper to retrieve the capabilities of a server such as available Collections and Formats


## To build
This is the source code of an npm package. To build install and build the library. This will create a lib folder with the transpiled library.
```
npm install
npm run build
```

## To use

Simply import the NPM package in to your project

```
npm install openapifeature
``` 

If you require the GetCapabilities functionality then also import: 
```
import {
  OAPIFeatureGetCapabilities,
  OAPIFeatureCapabilitiesObject,
  OAPIFeatureCapabilitiesFeatureType,
  CollectionLinkType,
  OAPIFeatureServiceLinkType,
} from '../../luciad/luciadmap/openapi/OAPIFeatureGetCapabilities';
```

At this moment you should be ready to use the functionality.

## Requirements.
* LuciadRIA 2020.0 or higher (place it on a local npm repository for instance verdaccio )
* A ES6 or Typescript capable transpiler. 
