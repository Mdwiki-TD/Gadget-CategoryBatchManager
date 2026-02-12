
import { defineComponent, ref, createApp } from "vue";
import './ui/styles/main.css'
import '@wikimedia/codex/dist/codex.style.css'
import BatchManager from "./BatchManager.js";

import {
    CdxButton,
    CdxDialog,
    CdxTextInput,
    CdxTextArea,
    CdxSelect,
    CdxCheckbox,
    CdxProgressBar,
    CdxMessage,
    CdxLabel,
    CdxMultiselectLookup,
    CdxTable,
} from "@wikimedia/codex";

const App = {
    name: "App",
    components: defineComponent({
        CdxButton,
        CdxDialog,
        CdxTextInput,
        CdxTextArea,
        CdxSelect,
        CdxCheckbox,
        CdxProgressBar,
        CdxMessage,
        CdxLabel,
        CdxMultiselectLookup,
        CdxTable,
    }),
    template: `
        <BatchManager />
    `,
    setup() {
        const open = ref(false);

        const primaryAction = {
            label: "Delete all changes and start over",
            actionType: "destructive",
        };
        const defaultAction = {
            label: "Cancel",
        };
        function onPrimaryAction() {
            // eslint-disable-next-line no-console
            console.log("Primary action taken");
            open.value = false;
        }
        return {
            open,
            primaryAction,
            defaultAction,
            onPrimaryAction,
        };
    },
};

createApp(App)
    // .use(BatchManager)
    .provide("BatchManager", BatchManager)
    .mount('#app')
