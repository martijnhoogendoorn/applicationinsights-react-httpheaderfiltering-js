import {ApplicationInsights} from '@microsoft/applicationinsights-web';
import {ReactPlugin} from '@microsoft/applicationinsights-react-js';
import {HttpHeaderFilterPlugin} from './modules/applicationinsights-httpheaderfilter/applicationinsights-httpheaderfilter.ts';

let reactPlugin = null;
let filterPlugin = null;
let appInsights = null;

/**
 * Create the App Insights Telemetry Service
 * @return {{reactPlugin: ReactPlugin, appInsights: Object, initialize: Function}} - Object
 */
const createTelemetryService = () => {

    /**
     * Initialize the Application Insights class
     * @param {string} instrumentationKey - Application Insights Instrumentation Key
     * @param {Object} browserHistory - client's browser history, supplied by the withRouter HOC
     * @return {void}
     */
    const initialize = (instrumentationKey, browserHistory) => {
        if (!browserHistory) {
            throw new Error('Could not initialize Telemetry Service');
        }
        if (!instrumentationKey) {
            throw new Error('Instrumentation key not provided in ./src/telemetry-provider.jsx')
        }

        reactPlugin = new ReactPlugin();
        filterPlugin = new HttpHeaderFilterPlugin();

        appInsights = new ApplicationInsights({
            config: {
                instrumentationKey: instrumentationKey,
                loggingLevelConsole: 2,
                enableRequestHeaderTracking: true,
                disableFetchTracking: false,
                maxBatchInterval: 0,
                enableDebug: true,
                extensions: [reactPlugin, filterPlugin],
                extensionConfig: {
                    [reactPlugin.identifier]: {
                        history: browserHistory
                    },
                    [filterPlugin.identifier]: {
                        filteredHeaders: {
                            Authorization: '[value removed]',
                            SomeOtherThing: null,
                        }
                    },
                }
            }
        });

        appInsights.loadAppInsights();
    };

    return {reactPlugin, appInsights, initialize};
};

export const ai = createTelemetryService();
export const getAppInsights = () => appInsights;
