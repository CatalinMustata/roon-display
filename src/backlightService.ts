export default class BacklightService {

    private backlightServerHost: string

    constructor(host: string) {
        this.backlightServerHost = host
    }

    public async setDisplay(enabled: boolean) {
        const command = enabled ? "on" : "off"

        await fetch(`${this.backlightServerHost}/set-display/${command}`, {
            method: "post"
        })
    }
}