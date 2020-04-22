import { RemoteDependencyData, IPageViewTelemetry, IMetricTelemetry, IAppInsights, IConfig } from '@microsoft/applicationinsights-common';
import { IPlugin, IConfiguration, IAppInsightsCore, ITelemetryPlugin, BaseTelemetryPlugin, CoreUtils, ITelemetryItem, IProcessTelemetryContext, ITelemetryPluginChain, _InternalMessageId, LoggingSeverity, ICustomProperties } from "@microsoft/applicationinsights-core-js";
import { IHttpHeaderFilterExtensionConfig } from './Interfaces/IHttpHeaderFilterExtensionConfig';

export default class HttpHeaderFilterPlugin extends BaseTelemetryPlugin {
    public priority : number = 200;
    public static identifier: string = "HttpHeaderFilterPlugin";

    private _analyticsPlugin!: IAppInsights;
    private _extensionConfig!: IHttpHeaderFilterExtensionConfig | undefined;

    initialize(config: IConfiguration & IConfig, core: IAppInsightsCore, extensions: IPlugin[], pluginChain?:ITelemetryPluginChain) {
        super.initialize(config, core, extensions, pluginChain);
        
        this._extensionConfig =
            config.extensionConfig && config.extensionConfig[this.identifier]
                ? (config.extensionConfig[this.identifier] as IHttpHeaderFilterExtensionConfig)
                : undefined;

        CoreUtils.arrForEach(extensions, ext => {
            const identifier = (ext as ITelemetryPlugin).identifier;
            if (identifier === 'ApplicationInsightsAnalytics') {
                this._analyticsPlugin = (ext as any) as IAppInsights;
            }
        });
    }

    /**
     * Filters out configured information from the telemetry event prior to sending it to Application Insights
     * @param event The event that needs to be processed
     */
    processTelemetry(event: ITelemetryItem, itemCtx?: IProcessTelemetryContext) {
        if(this._extensionConfig !== undefined) {
            // Only process RemoteDependency (Ajax and fetch requests)
            if(event.baseType === RemoteDependencyData.dataType) {
                let headers = event.baseData!["properties"]?.requestHeaders;
                if(headers !== undefined && this._extensionConfig.filteredHeaders !== undefined) {            
                    CoreUtils.arrForEach(Object.keys(this._extensionConfig.filteredHeaders), filteredHeader => {
                        // Ensure we ignore the case of the header
                        let headerProperty = this.getPropertyCaseInsensitive(headers, filteredHeader);
                        // In case we found a match between configured and case insensitive property of the headers
                        if(filteredHeader !== undefined && headerProperty !== undefined) {
                            // If a replacement value is configured
                            if(this._extensionConfig?.filteredHeaders![filteredHeader]) {
                                // Enter the replacement value
                                headers[headerProperty] = this._extensionConfig?.filteredHeaders![filteredHeader];
                            } else {
                                // Otherwise, silently delete the property
                                delete headers[headerProperty];
                            }
                        }
                    });
                }
            }
        }

        this.processNext(event, itemCtx!);
    }

    private getPropertyCaseInsensitive(object : any, key : string) {
        return Object.keys(object).filter(function(k) {
            return k.toLowerCase() === key.toLowerCase();
        })[0];
    }

    trackMetric(metric: IMetricTelemetry, customProperties: ICustomProperties) {
        if (this._analyticsPlugin) {
            this._analyticsPlugin.trackMetric(metric, customProperties);
        } else {
            this.diagLog().throwInternal(
                LoggingSeverity.CRITICAL, _InternalMessageId.TelemetryInitializerFailed, "Analytics plugin is not available, React plugin telemetry will not be sent: ");
        }
    }

    trackPageView(pageView: IPageViewTelemetry) {
        if (this._analyticsPlugin) {
            this._analyticsPlugin.trackPageView(pageView);
        } else {
            this.diagLog().throwInternal(
                LoggingSeverity.CRITICAL, _InternalMessageId.TelemetryInitializerFailed, "Analytics plugin is not available, React plugin telemetry will not be sent: ");
        }
    }
}
