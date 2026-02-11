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
const config = {
    get: (key) => {
        const configData = {
            wgPageName: 'Category:Our World in Data graphs of Austria',
            wgUserName: 'ExampleUser',
            wgCanonicalNamespace: 'Category',
            wgUserGroups: ['*'],
        };
        return configData[key] || null;
    }
};

export default { Api, config };
