# AutoWash247 brand assets

The current brand symbol is a front-view car entering an A-shaped automatic
wash gantry. It supersedes the `A/` glyph in the older Phase 3 HTML previews.
The symbol uses the existing action red (`#c62929`) and white. Keep the car and
gantry as bold shapes so the favicon remains legible at 16 px.

## Production use

- `src/components/brand/BrandIcon.tsx` draws the shared public and Payload mark.
- `src/app/icon.svg` is the public browser-tab icon; `public/favicon.svg` is the
  icon configured for the Payload admin. Both match the component geometry.
- The public header pairs the mark with the live `SiteSettings.brandName` text.
  Do not bake the name into the SVG: the CMS owns it and text remains readable
  when the mark is small.
- `public/brand/icons/` contains the matching 48 px pictograms for the QR step,
  wash package, automatic gantry, water, opening time, location, phone, clean
  finish, and help. They are individual SVG assets, not a sliced raster sheet.

## Canva explorations

- [Automatic-wash favicon concept](https://www.canva.com/M/MAHXbp8mEMM)
- [AutoWash247 horizontal brand lockup](https://www.canva.com/M/MAHXbsHdBy8)
- [Nine-icon visual reference](https://www.canva.com/M/MAHXbsP4Ihk)

The Canva outputs are visual references. The checked-in SVGs are the assets
used by the application; their exact shapes were redrawn for a crisp small
favicon and text is rendered by the application.
