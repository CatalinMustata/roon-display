"use strict"

const $ = require("jquery");
(<any>window).$ = (<any>window).jQuery = $

import RoonApi from "node-roon-api"
import RoonApiTransport from "node-roon-api-transport"
import RoonApiImage from "node-roon-api-image"

import Controller from "./controller"
import { LogService } from "./logService";
import DisplayConfig from "./objects/DisplayConfig";

// @ts-ignore -- this is supposed to run in a browser (which can't load configs from disk)
// so in this case the config will be in a separate, non-built, file loaded by index.html
// we will assume this will always be here or else index.html is broken
const config = <DisplayConfig>displayConfig

const logger = new LogService(config.logging.logServiceHost, config.logging.logServicePort, "Roon-Display")

const controller = new Controller(config.targetZone, config.graphics.enableDithering, config.backlightService, logger)
controller.setCore(null) // init with no core

const roonConnected = (core) => {
    logger.sendLog(`Connected to ${core.display_name} - ${core.display_version}`);

    controller.setCore(core)
}

const roonCoreUnpaired = () => {
    logger.sendLog("Core Unpaired")
    controller.setCore(null)
}


var roon = new RoonApi({
    extension_id: 'com.bearsoft.roonDisplay',
    display_name: "Roon Display",
    display_version: "1.0.0",
    publisher: 'Catalin Mustata',
    email: 'catalin.mustata@gmail.com',
    core_paired: roonConnected,
    core_unpaired: roonCoreUnpaired
});


roon.init_services({
    required_services: [RoonApiTransport, RoonApiImage]
})

function connect() {
    logger.sendLog("Will connect to Roon");
    roon.ws_connect({
        host: config.coreIP,
        port: config.corePort,
        onclose: () => setTimeout(connect, 3000)
    })
}

// start connection
connect()

