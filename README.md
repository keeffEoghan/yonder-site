# Yonder Template
## (Adapted from Base Template, npm Version)

This is based on the Squarespace Base Template, a minimal Squarespace template using **_Node Package Manager_** for local development, module installation and deployment.

### Installation and use

***Prerequisite:***

If you haven't already, install the [Squarespace Local Development Server](http://developers.squarespace.com/local-development). Then...

Clone this repository:

```
git clone git@github.com:Squarespace/base-template-npm.git
```

Install npm packages:

```
npm install
```

Start working:

```
npm start
```

... Make some changes.

Finally, deploy:

```
npm run deploy
```

### Dependencies

Base Template depends on the following Squarespace modules for development:

* [@squarespace/toolbelt](https://github.com/Squarespace/squarespace-toolbelt) - utilities for building and deploying a template.
* [webpack](https://webpack.github.io/) - The JS bundler we're using.

Base Template also depends on the following modules at runtime:

* [@squarespace/core](https://github.com/Squarespace/squarespace-core) - core Squarespace javascript functionality

*Note: `npm start` will prompt you to install the [Squarespace Local Development Server](developers.squarespace.com/local-development) if you haven't already.*


### Full npm script reference


#### npm run build

Cleans the build folder, copies squarespace files (jsont, less, assets folder content) into the build folder, runs webpack to build the template javascript.

#### npm run watch

Runs build, then watches the source folder for changes to squarespace files and javascript, automatically updating the built template for each change.

#### npm start [-- options]

Runs watch, and simultaneously launches sqs-server. By default this runs on localhost:9000. If you want to use another port use the command:

```
npm start -- -p PORT
```

#### npm run deploy [-- options]

Deploys your built template to production using git. If not already configured, initializes a git repo for deployment in your build folder. Note this is separate from your source repository, and will only contain the production built template.

By default your deployment will be commited with just a timestamp message. If you want to provide a custom message use the command:

```
npm run deploy -- -m "your message"
```

### Project Structure

    /base-template-npm
    |--- assets/
    |--- blocks/
    |--- build/             <-- generated by the build script, ignored by this repo
    |--- collections/
    |--- node_modules/      <-- generated by npm install, ignored by this repo
    |--- pages/
    |--- scripts/
    |--- styles/
    |--- site.region
    |--- template.conf
    |--- package.json        <-- defines build commands, template module dependencies
    |--- webpack.config.json <-- webpack build settings
