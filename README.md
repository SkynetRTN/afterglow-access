# Afterglow Access

Afterglow Access is the client-side component of the Afterglow Platform.  It was developed by the Skynet Robotic Telescope Network as an accessible, web-based application allowing users to view, process, and analyze astronomical data products without the need to download large data sets or install software.  During installation,  Afterglow Access is paired with an instance of the platform's server-side component called [Afterglow Core](https://github.com/SkynetRTN/afterglow-core).  Through interactions with the Core's API, Afterglow Access provides an intutive interface for importing data, adjusting display settings, inspecting headers, performing photometry, registering and stacking images, sonifying image data, and much more.  Afterglow Access utilizes Javascript and HTML which makes it cross-platform compatible when accessed through a modern browser. 

- [Afterglow Access](https://github.com/SkynetRTN/afterglow-access)
- [Afterglow Core](https://github.com/SkynetRTN/afterglow-core)
- [License](https://github.com/SkynetRTN/afterglow-core/blob/1_0/LICENSE.md)


## Getting Started

### Afterglow Core

Afterglow Access must be paired with an instance of [Afterglow Core](https://github.com/SkynetRTN/afterglow-core).  Ensure that you have an instance of the Core installed and running before continuing. 

- [Getting Started with Afterglow Core](https://github.com/SkynetRTN/afterglow-core/1_1/README.md#getting-started)

### Installation

To get started, follow these instructions:

1. If you haven't done it already, make a fork of this repo.
2. Clone to your local computer or server using git.
3. Make sure that you have installed NodeJS.
4. Create a Afterglow configuration file by copying the default template to a new file named `afterglow.json` in the `./src/` directory. For example: `cp ./src/afterglow.defaults.json ./src/afterglow.json`.
5. Open `./src/afterglow.json` and ensure all configuration settings are correct.  For more information, see the [configuration section](#configuration) below.
6. Run `npm install`.

#### Local Development
Afterglow access includes a built-in development server which can be used for local testing.  By default,  the server is configured to run on port 4200.  To start the development server:

1. Run `npm run start`.
2. Open a browser and navigate to [http://127.0.0.1:4200](http://127.0.0.1:4200)

The `proxy.config.json` file can be configured to proxy local requests from the development server to the Core's API.  By default, the development server is configured such that all requests sent to [http://127.0.0.1:4200/core](http://127.0.0.1:4200/core) will be proxied to http://127.0.0.1:5000.  If the Afterglow Core development server is running at a different location or port you will need to modify the proxy configuration file. 

#### Production
To build the application for production:

1. Run `ng build --prod`.  For additional options, see [Angular CLI build documentation](https://angular.io/cli/build)
2. Copy the `./dist/afterglow-access` directory to the desired location on your server where it can be accessed by clients.

### Configuration

Your installation of Afterglow Access can be configured by modifying the `./src/afterglow.json` file.  The file is automatically copied to the assets directory when the application is built.  The current default configuration is:

```json
{
    "coreUrl": "http://127.0.0.1:4200/core",
    "authMethod": "cookie",
    "authCookieName": "afterglow_core_access_token",
    "oauth2ClientId": null,
    "tileSize": 1024,
    "saturationDefault": 99.0,
    "backgroundDefault": 15.0
}
```

| Parameter         | Type                  | Description                           |
| ----------------- | --------------------- | ------------------------------------- |
| coreUrl           | string                | Location of the Afterglow Core server |
| authMethod        | 'cookie' or 'oauth2'  | When set to 'cookie', cookies will be used for authentication.  When set to 'oauth2', users will be redirected to the Core's OAuth2.0 Provider |
| tileSize          | integer               | The tile size Afterglow Access uses when it downloads pixel data |
| saturationDefault | number                | The default percentile used when calculating saturation levels |
| backgroundDefault | number                | The default percentile used when calculating background levels |

## Learn

- [YouTube demo](https://youtu.be/Z6qi-aJ613E?t=317)
- [YouTube videos](https://www.youtube.com/playlist?list=PLy034wwN98YKMepknVKcRPB9qpN0aHYaJ)


## License

For non-commercial, non-competitive use,  see the license included with the source code.  For other use, contact the [Skynet Robotic Telescope Network](https://skynet.unc.edu).