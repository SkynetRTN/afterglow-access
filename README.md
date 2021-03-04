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
4. Create a Afterglow configuration file by copying the default template `cp src/afterglow.defaults.json src/afterglow.json`
5. Open `src/afterglow.json` and ensure all configuration settings are correct.
6. Run `npm install`.
7. Run `ng build --prod`.  For additional options, see [Angular CLI build documentation](https://angular.io/cli/build)
8. Copy the `dist/afterglow-access` directory to the desired location on your server where it can be accessed by clients.

## Learn

- [YouTube demo](https://youtu.be/Z6qi-aJ613E?t=317)
- [YouTube videos](https://www.youtube.com/playlist?list=PLy034wwN98YKMepknVKcRPB9qpN0aHYaJ)
