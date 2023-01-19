import {describe, expect, it} from '@jest/globals';
import "isomorphic-fetch";

import {CollectionLinkType, OAPIFeatureGetCapabilities} from "./OAPIFeatureGetCapabilities";

class Test extends OAPIFeatureGetCapabilities {
    static testAll() {
        describe('OAPIFeatureGetCapabilities',  () => {
            it('OAPIFeatureGetCapabilities.fromURL success', async () => {
                return OAPIFeatureGetCapabilities.fromURL("https://demo.pygeoapi.io/master/",{}).then(data=>{
                    expect(data.version).toBe("3.0.2");
                }, (err)=>{
                    expect(true).toBe(false);
                })
            });
            it('OAPIFeatureGetCapabilities.fromURL success', async () => {
                return OAPIFeatureGetCapabilities.fromURL("https://demo.pygeoapi.io/master/",{}).then(data=>{
                    expect(data.featureTypes.length).toBe(16);
                }, (err)=>{
                    expect(true).toBe(false);
                })
            });
            it('OAPIFeatureGetCapabilities.fromURL success', async () => {
                return OAPIFeatureGetCapabilities.fromURL("https://demo.pygeoapi.io/master/",{filterCollectionsByLinkType: CollectionLinkType.Items}).then(data=>{
                    expect(data.featureTypes.length).toBe(14);
                }, (err)=>{
                    expect(true).toBe(false);
                })
            });
            it('OAPIFeatureGetCapabilities.fromURL 404', async () => {
                return OAPIFeatureGetCapabilities.fromURL("https://demo.pygeoapi.io/master2/",{}).then(data=>{
                    expect(data.version).toBe("3.0.1");
                }, (err)=>{
                    expect(404).toBe(404);
                })
            });
            it('OAPIFeatureGetCapabilities.fromURL Not JSON', async () => {
                return OAPIFeatureGetCapabilities.fromURL("https://demo.pygeoapi.io/",{}).then(data=>{
                    expect(data.version).toBe("3.0.1");
                }, (err)=>{
                    expect(err).toBe("Not JSON");
                })
            });
            it('OAPIFeatureGetCapabilities.fromURL Not valid API', async () => {
                return OAPIFeatureGetCapabilities.fromURL("https://jsonplaceholder.typicode.com/todos/",{}).then(data=>{
                    expect(data.version).toBe("3.0.1");
                }, (err)=>{
                    expect(err).toBe("Invalid format: (property 'links' is missing)");
                })
            });

            it('OAPIFeatureGetCapabilities.getHostURL relative url', async () => {
                expect(OAPIFeatureGetCapabilities.getHostURL("../api/user/proxy/auto_1674068062840")).toEqual("")
            });

            it('OAPIFeatureGetCapabilities.getHostURL full url', async () => {
                expect(OAPIFeatureGetCapabilities.getHostURL("https://demo.pygeoapi.io/master2/")).toEqual("https://demo.pygeoapi.io")
            });

            it('OAPIFeatureGetCapabilities.getHostURL localhost', async () => {
                expect(OAPIFeatureGetCapabilities.getHostURL("http://localhost:8080/api/user/proxy/auto_1674072985294_1")).toEqual("http://localhost:8080")
            });
        });
    }
}

Test.testAll();

