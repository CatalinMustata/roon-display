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

const LoadingText = [".", "..", "..."]

const targetZone = "Node"

const FaceFront = "front"
const FaceBack = "back"

export default class Controller {

    private core: RoonCore
    private zone: Zone

    private currentFace = FaceFront

    private loadingAnimator = null

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
            $("#connecting-content-box").fadeIn(300)
            let index = 0
            this.loadingAnimator = setInterval(() => {
                $("#connecting-content-box h1").attr("data-after", LoadingText[index])
                index = (index + 1) % 3
            }, 1000)
        } else {
            $("#connecting-content-box").fadeOut(300)
            clearInterval(this.loadingAnimator)
        }

        return visible
    }

    private zonesUpdated(payload) {
        const updatedZones = payload.zones || payload.zones_added || payload.zones_changed
        const zoneSeekChange = payload.zones_seek_changed
        if (updatedZones) {
            const zone = updatedZones.find(zone => zone.display_name == targetZone)

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

        const nowPlaying = zone.now_playing

        if (!prevZone || prevZone.now_playing.image_key != zone.now_playing.image_key) {
            // update image and then track info for consistency
            this.updateImage(nowPlaying)
        } else {
            // image hasn't changed (probably still on the same album), so just update track info
            this.updateTrack(nowPlaying)
        }
    }

    private updateTrack(nowPlaying) {
        const artistInfo = nowPlaying.three_line

        $("#song-name").text(artistInfo.line1)
        $("#artist").text(artistInfo.line2 || "")
        $("#album").text(artistInfo.line3 || "")

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
            if (this.currentFace === FaceFront) {
                $("#cover-back").css("background-image", divImageData)
                this.currentFace = FaceBack
            } else {
                $("#cover-front").css("background-image", divImageData)
                this.currentFace = FaceFront
            }

            //trigger animation
            $("#album-cover").toggleClass("animate-change")

            this.updateTrack(nowPlaying)
        })
    }

    private computeTime(secondsTotal: number): { mins: string, seconds: string } {
        const mins = `${~~(secondsTotal / 60)}`
        const seconds = `${(secondsTotal % 60)}`.padStart(2, "0")

        return { mins, seconds }
    }
}