"use strict"

const $ = require("jquery");
(<any>window).$ = (<any>window).jQuery = $

import RoonApi from "node-roon-api"
import RoonApiTransport from "node-roon-api-transport"
import RoonApiImage from "node-roon-api-image"

import Controller from "./controller"

const controller = new Controller()
controller.setCore(null) // init with no core

const roonConnected = (core) => {
    console.log(`Connected to ${core.display_name} - ${core.display_version}`);

    controller.setCore(core)
}

const roonCoreUnpaired = () => {
    console.log("Core Unpaired")
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
    console.log("Will connect to Roon");
    roon.ws_connect({
        host: displayConfig.coreIP,
        port: displayConfig.corePort,
        onclose: () => setTimeout(connect, 3000)
    })
}

// start connection
connect()

