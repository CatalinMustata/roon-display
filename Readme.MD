## Roon Display

This little piece of software is designed to run in a browser (like Chromium kiosk mode) on a RPi or similar and
give you a nice UI with album art and time for your streamer.

I'm not actively maintaining this other than fixes when it craps out on my own hardware. Feel free to open PRs if
you wish and I will review and possibly merge them

**NOTICE:**
I do plan to refactor this into a separate backend service (which will support auto Core discovery) and a thin UI that uses the local service, but I honestly don't know when I'll have time,

### Setting up a local instance

Run:
- `npm install`
- `npm run build-static` (this builds a static version, not a hot-reload Parcel server)
- make sure you have the proper Roon Core IP (whatever your local installation uses) and port (`9330` at the time of this writing) in `dist/config.js`
- hoping you're on SystemD, copy the provided service to `/etc/systemd/system/roondisplay.service` and then run `sudo systemctl start roondisplay` 
- you then probably want to enable the service as well (`sudo systemctl enable roondisplay`)

### Debugging

If you're running it like me in a Chromium in kiosk mode, you won't have access to logs, so the only way to figure 
out what's wrong with it is to run a `log-collector` service (check out the repo on my GitHub). That will allow Roon Display to write its logs through a websocket and onto disk.
