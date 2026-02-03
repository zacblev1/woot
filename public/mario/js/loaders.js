// Base path for all assets
const BASE_PATH = '/mario';

function resolvePath(url) {
    // If URL already starts with /mario or is absolute, use as-is
    if (url.startsWith('/mario') || url.startsWith('http')) {
        return url;
    }
    // Otherwise prepend /mario
    return BASE_PATH + url;
}

export function loadImage(url) {
    return new Promise(resolve => {
        const image = new Image();
        image.addEventListener('load', () => {
            resolve(image);
        });
        image.src = resolvePath(url);
    });
}

export function loadJSON(url) {
    return fetch(resolvePath(url))
    .then(r => r.json());
}
