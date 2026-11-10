# Mystic Quest

## Run locally

Keep the complete `Mystic_Quest` folder together. From inside that folder, start a local web server:

```powershell
python -m http.server 8000
```

Open <http://localhost:8000/> in a browser and leave the server window open while playing. Stop it with `Ctrl+C`.

## Share with another computer

- To play on the same local network, start the server as above, find this computer's local IP address, and have the other computer open `http://<this-computer-ip>:8000/`. Allow Python through the firewall if prompted. Both computers must be on the same network.
- To share over the internet, upload the complete folder to a static website host (for example, GitHub Pages). Share the published website URL. The game uses relative file paths, so keep its folders and files in their existing layout.

The browser is all the other computer needs for a hosted copy. The desert level currently loads some sound effects from external URLs, so those sounds require an internet connection.
