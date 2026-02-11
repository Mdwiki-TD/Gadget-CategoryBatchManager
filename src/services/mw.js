class Api {
    constructor() {
    }
    edit(...args) {
        if (!args) {
            return false;
        }
        return [];
    }
    get(...args) {
        if (!args) {
            return false;
        }
        return [];
    }
    searchInCategory(...args) {
        if (!args) {
            return false;
        }
        return [];
    }

    getCategories(...args) {
        if (!args) {
            return false;
        }
        return [];
    }
}

class mw {
    constructor() {
    }
    Api() {
        return new Api();
    }
}

export default {
    mw,
    Api
};
