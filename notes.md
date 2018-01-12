# To-do

- SVG holds
    - Centered and scaled SVGs (remove current `transform` workaround)
    - Strokes
- Block out main zones and animations
- Document some of the Squarespace workarounds you're using
    - [Navigation links](https://support.squarespace.com/hc/en-us/articles/205814758-Using-links-in-your-navigation)
    - Arbitrary files (e.g: SVG):
        - [As file links](https://support.squarespace.com/hc/en-us/articles/205813928)
        - [As code blocks](https://answers.squarespace.com/questions/5898/can-i-upload-a-svg-file-to-the-image-block.html)
    - Info in odd places (e.g: [business info](https://support.squarespace.com/hc/en-us/articles/212872328))
    - Passing info per-page, for global menu color (where there's no categories/tags):
        - Header code injection - `<style>.yr-nav-button { color: #1D443D; }</style>`
- Finish AJAX loading
    - Animation
- Design
    - Contact page
    - Event detail page
    - New hold SVG assets (centered within 200x200 canvas, with all borders present)
- Set up [Webpack](https://github.com/webpack-contrib/extract-text-webpack-plugin/blob/webpack-1/README.md) with [Autoprefixer](https://github.com/postcss/autoprefixer#webpack) and [LESS](https://github.com/webpack-contrib/less-loader)?
    - Currently working with Squarespace's weird divergent LESS implementation; prefixes etc are tricky.
    - Parking for now, as prefixing isn't as big an issue as it once was (for our current needs at least).

# Done

- Decide how to configure the landing page holds
    - Secondary navigation links