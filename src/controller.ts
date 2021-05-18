import Zone from "node-roon-api-transport"
import RoonApiImage from "node-roon-api-image"
import RoonApiTransport from "node-roon-api-transport"

type RoonCore = {
    services: {
        RoonApiImage: RoonApiImage
        RoonApiTransport: RoonApiTransport
    }
}

const AlbumImageConfig = {
    scale: "fit",
    width: 360,
    height: 360,
    format: "image/jpeg"
}

enum ZoneState {
    Playing = "playing",
    Paused = "paused",
    Loading = "loading",
    Stopped = "stopped"
}

enum UIState {
    Playing = "playing",
    NotPlayingTimeout = "notPlayingTimeout",
    NotPlaying = "notPlaying",
    DisplayOffTimeout = "displayOffTimeout",
    DisplayOff = "displayOff"
}

export default class Controller {

    private static readonly LoadingText = [".", "..", "..."]

    private static readonly FaceFront = "front"
    private static readonly FaceBack = "back"

    private static readonly PAUSE_TIMEOUT = 10000
    private static readonly DISPLAY_OFF_TIMEOUT = 30000
    private static readonly CLOCK_UPDATE = 60000
    private static readonly ANIMATION_DURATION = 300

    private core: RoonCore
    private targetZone: string
    private zone: Zone

    private currentFace = Controller.FaceFront

    // TIMERS
    private loadingAnimator = null
    private pauseTimer = null
    private displayOffTimer = null

    // UI STATE
    private uiState = UIState.NotPlaying

    constructor(targetZone: string, enableDithering: boolean) {
        this.targetZone = targetZone

        if (enableDithering) {
            $("#noise-overlay").show()
        }

        // update clock displays
        setInterval(() => {
            const now = new Date()
            const minutes = `${now.getMinutes()}`
            const time = `${now.getHours()}:${minutes.padStart(2, "0")}`
            $("#clock-large").text(time)
            $("#clock-small").text(time)
        }, Controller.CLOCK_UPDATE)
    }

    public setCore(core: RoonCore | null) {
        this.core = core

        // if no core, show connecting screen and return
        if (this.setConnectingScreen(!core)) return

        core.services.RoonApiTransport.subscribe_zones((res, payload) => {
            this.zonesUpdated(payload)
        })
    }

    private setConnectingScreen(visible: boolean): boolean {
        if (visible) {
            $("#connecting-content-box").fadeIn(Controller.ANIMATION_DURATION)
            let index = 0
            this.loadingAnimator = setInterval(() => {
                $("#connecting-content-box h1").attr("data-after", Controller.LoadingText[index])
                index = (index + 1) % 3
            }, 1000)
        } else {
            $("#connecting-content-box").fadeOut(Controller.ANIMATION_DURATION)
            clearInterval(this.loadingAnimator)
            this.loadingAnimator = null
        }

        return visible
    }

    private zonesUpdated(payload) {
        const updatedZones = payload.zones || payload.zones_added || payload.zones_changed
        const zoneSeekChange = payload.zones_seek_changed
        if (updatedZones) {
            const zone = updatedZones.find(zone => zone.display_name == this.targetZone)

            if (!zone) {
                console.log("Failed to find zone. Check config")
            }

            this.updateZoneInfo(zone)
        } else if (zoneSeekChange) {
            const zone = zoneSeekChange.find(zone => zone.zone_id = this.zone.zone_id)

            if (!zone) {
                console.log("Failed to find zone. Check config")
            }

            this.updateSeek(zone.seek_position, this.zone.now_playing.length)
        }
    }

    private updateZoneInfo(zone: Zone) {
        const prevZone = this.zone
        this.zone = zone

        if (!zone) {
            console.log("Should clear display")
            return
        }

        this.updateZoneState(zone.state)

        const nowPlaying = zone.now_playing

        if (!nowPlaying) return

        if (!prevZone || prevZone.now_playing.image_key != nowPlaying.image_key) {
            // update image and then track info for consistency
            this.updateImage(nowPlaying)
        } else {
            // image hasn't changed (probably still on the same album), so just update track info
            this.updateTrack(nowPlaying)
        }
    }

    private updateTrack(nowPlaying) {
        const artistInfo = nowPlaying.two_line

        $("#song-name").text(artistInfo.line1)
        $("#artist-album").text(artistInfo.line2 || "")

        $("#currently-paused").text(nowPlaying.one_line.line1)

        const { mins, seconds } = this.computeTime(nowPlaying.length)

        $("#total").text(`${mins}:${seconds}`)

        this.updateSeek(nowPlaying.seek_position, nowPlaying.length)
    }

    private updateSeek(position, totalSeconds) {
        const { mins, seconds } = this.computeTime(position)

        const seekPosition = (position / totalSeconds) * 100

        $("#bar-actual").css("width", `${seekPosition}%`)

        $("#seek").text(`${mins}:${seconds}`)
    }

    private updateImage(nowPlaying) {
        if (!nowPlaying) return

        this.core.services.RoonApiImage.get_image(this.zone.now_playing.image_key, AlbumImageConfig, (error, contentType, data) => {
            if (error) {
                console.log("Failed to get album art")
                return
            }

            const base64data = data.toString('base64')
            const imageData = `data:${contentType};base64,${base64data}`
            $("#album-art-bg").animate({
                opacity: 0
            }, 350, () => {
                $("#album-art-bg").attr("src", imageData)
                $("#album-art-bg").animate({ opacity: 0.4 }, 350)
            })

            // update the currently invisible face, preparing for animation
            const divImageData = `url(${imageData})`
            if (this.currentFace === Controller.FaceFront) {
                $("#cover-back").css("background-image", divImageData)
                this.currentFace = Controller.FaceBack
            } else {
                $("#cover-front").css("background-image", divImageData)
                this.currentFace = Controller.FaceFront
            }

            //trigger animation
            $("#album-cover").toggleClass("animate-change")

            this.updateTrack(nowPlaying)
        })
    }

    private updateZoneState(state: ZoneState) {
        if (state == ZoneState.Paused || state == ZoneState.Stopped) {
            this.uiState = UIState.NotPlayingTimeout

            console.log("Will transition to Paused state")

            // start timer to transition to Paused UI state
            this.pauseTimer = setTimeout(() => {
                console.log("Entering Paused State")
                this.setPausedScreen(true)


                this.uiState = UIState.DisplayOffTimeout

                // start timer to transition to Display Off state
                this.displayOffTimer = setTimeout(() => {
                    console.log("Turning off display")

                    this.uiState = UIState.DisplayOff
                }, Controller.DISPLAY_OFF_TIMEOUT)

            }, Controller.PAUSE_TIMEOUT)
        } else if (this.uiState === UIState.NotPlayingTimeout) {
            this.uiState = UIState.Playing

            console.log("Cancel transition to Paused state")

            // cancel timers
            clearTimeout(this.pauseTimer)
            this.displayOffTimer && clearTimeout(this.displayOffTimer)

            this.pauseTimer = null
            this.displayOffTimer = null
        } else if (this.uiState === UIState.NotPlaying || this.uiState == UIState.DisplayOffTimeout) {
            console.log("Exiting Paused state")

            this.uiState = UIState.Playing
            this.setPausedScreen(false)
        } else if (this.uiState === UIState.DisplayOff) {
            console.log("Turning display back on")

            this.uiState = UIState.Playing
            this.setPausedScreen(false)
        }
    }

    private setPausedScreen(visible: boolean) {
        if (visible) {
            $("#paused-content-box").fadeIn(Controller.ANIMATION_DURATION)
        } else {
            $("#paused-content-box").fadeOut(Controller.ANIMATION_DURATION)
        }
    }

    private computeTime(secondsTotal: number): { mins: string, seconds: string } {
        const mins = `${~~(secondsTotal / 60)}`
        const seconds = `${(secondsTotal % 60)}`.padStart(2, "0")

        return { mins, seconds }
    }
}