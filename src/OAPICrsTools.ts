class OAPICrsTools {
    /**
     *
     * @param uriOrName
     * @private
     */
    private static getReferenceName(uriOrName: string) {
        if (!uriOrName.startsWith('http')) {
            return uriOrName;
        }
        const prefix = 'http://www.opengis.net/def/crs/';
        if (uriOrName.startsWith(prefix)) {
            const cleanCRS = uriOrName.substr(prefix.length);
            const parts = cleanCRS.split('/');
            if (parts.length === 3) {
                const name = parts[0];
                const version = parts[1];
                const code = parts[2];
                switch (name) {
                    case 'EPSG':
                        return name + ':' + code;
                        break;
                    case 'OGC':
                        return 'CRS' + ':' + code.substr('CRS'.length);
                        break;
                }
            }
        }
        return uriOrName;
    }
}

export { OAPICrsTools }