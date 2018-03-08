# SquareSpace

- If you're limited by the style editor, you can often use a `code block`...

# To-do

- Home menu comparison view
- Errors
    - Sort out Style Editor breakage bullshit - #3302864
- Content
    - Ensure colors per section work where native CSS variables don't (JS fallback, setting theme number?)
- SVG holds
    - Multiple themes in style editor... clunky but needed? Improve with JS rather than JSON-T / Style Editor
    - Later
        - Configurable by CMS?
            - Number of holds (consider color themes too)
                - Hacky... can tweak values create new tweaks? Like have a value tweak for number of holds, and generate enough corresponding tweaks in LESS...?
- Squarespace setup
    - Transfer template, domain to live
- Document some of the Squarespace workarounds you're using
    - 2 Ways of doing the header banners:
        - With the Squarespace image poster layout and correct font settings (defaults)
        - With a `text-block`, `h1`, and header code injected `style` or `code-block` to give it a background image: `.yr-main > .sqs-layout:first-child > .sqs-row:first-child > .col:first-child > .sqs-block-html { /* ... */ }`
    - [Navigation links](https://support.squarespace.com/hc/en-us/articles/205814758-Using-links-in-your-navigation)
    - Arbitrary files (e.g: SVG):
        - [As file links](https://support.squarespace.com/hc/en-us/articles/205813928)
        - [As code blocks](https://answers.squarespace.com/questions/5898/can-i-upload-a-svg-file-to-the-image-block.html)
    - Info in odd places (e.g: [business info](https://support.squarespace.com/hc/en-us/articles/212872328))
    - Passing info per-page, for global menu color (where there's no categories/tags):
        - Header code injection - `<style>.yr-nav-button { color: #1D443D; }</style>`
- Design
    - Not clear you can scroll the nav menu on small screens...?
    - Contact page
    - Event detail page
    - SVG asset notes:
        - Inline styles (`CSS Properties: Style Attributes`)
        - Centered within 200x200 canvas, covering size, around text
        - All borders present
- Set up [Webpack](https://github.com/webpack-contrib/extract-text-webpack-plugin/blob/webpack-1/README.md) with [Autoprefixer](https://github.com/postcss/autoprefixer#webpack) and [LESS](https://github.com/webpack-contrib/less-loader)?
    - Currently working with Squarespace's weird divergent LESS implementation; prefixes etc are tricky.
    - Parking for now, as prefixing isn't as big an issue as it once was (for our current needs at least).

# Done

- Finish AJAX loading
    - Page animations
- Block out main zones and animations
- Content
    - Custom overrides for certain interior blocks
        - Give a simple `class`-based way for editors to enable the more complex tweak-based overrides on an individual basis (say, JS class switching in header-code-injection).
        - Pick certain existing blocks to custom decorate?
        - Use `code blocks` with given code if really needed...
        - Header code injection, add a `style` and target the `#block-xxx` IDs
    - Alternating background color overlay
    - Fix weird image positioning bug
    - Colors per section
    - Responsive wrapping columns, but only for full-width rows...?
- Fonts and typography
    - Go through content variations
    - [Buy](https://www.myfonts.com/cart/432948577)
    - Sort out the sidebar etc styles again.
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