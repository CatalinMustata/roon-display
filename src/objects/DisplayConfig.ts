export default interface displayConfig {
    coreIP: string,
    corePort: number,
    targetZone: string,
    backlightService: string,
    graphics: GraphicsConfig,
    logging: LoggingConfig
}

interface GraphicsConfig {
    enableDithering: boolean
}

interface LoggingConfig {
    logServiceHost: string,
    logServicePort: number
}