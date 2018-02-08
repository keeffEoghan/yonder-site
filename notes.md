# SquareSpace

- If you're limited by the style editor, you can often use a `code block`...

# To-do

- Fonts and typography
- Content
    - Responsive wrapping columns, but only for full-width rows...?
    - Custom overrides for certain interior blocks
        - Pick certain existing blocks to custom decorate?
        - Use `code blocks` with given code if really needed...
    - Colors per section
- SVG holds
    - Multiple themes in style editor... clunky but needed?
    - Later
        - Configurable by CMS?
            - Number of holds (consider color themes too)
                - Hacky... can tweak values create new tweaks? Like have a value tweak for number of holds, and generate enough corresponding tweaks in LESS...?
- Block out main zones and animations
- Squarespace setup
    - Transfer template, domain to live
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
- Set up [Webpack](https://github.com/webpack-contrib/extract-text-webpack-plugin/blob/webpack-1/README.md) with [Autoprefixer](https://github.com/postcss/autoprefixer#webpack) and [LESS](https://github.com/webpack-contrib/less-loader)?
    - Currently working with Squarespace's weird divergent LESS implementation; prefixes etc are tricky.
    - Parking for now, as prefixing isn't as big an issue as it once was (for our current needs at least).

# Done

- SVG holds
    - Centered and scaled SVGs (remove current `transform` workaround)
    - Strokes
    - Configurable by CMS?
        - Hold SVG inline images (`code block`)
- Main navigation
    - Switch from background image tweak to open block field...
    - Dark/light colors - switch based on what's beneath (not always clear), or have floating header bar appear?
- Design
    - New hold SVG assets
        - Centered within 200x200 canvas
        - All borders present
    - Dark/light colors - switch based on what's beneath (not always clear), or have floating header bar appear?
- Decide how to configure the landing page holds
    - Secondary navigation links