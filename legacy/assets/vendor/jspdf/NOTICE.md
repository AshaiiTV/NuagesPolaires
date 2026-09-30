# jsPDF 4.2.1

Vendored browser UMD distribution used by the character-sheet PDF export.

- Upstream project: https://github.com/parallax/jsPDF
- Release: https://github.com/parallax/jsPDF/releases/tag/v4.2.1
- Release published: 2026-03-17. Verified as the latest stable GitHub release on 2026-09-24.
- Distribution source: https://raw.githubusercontent.com/parallax/jsPDF/v4.2.1/dist/jspdf.umd.min.js
- License source: https://raw.githubusercontent.com/parallax/jsPDF/v4.2.1/LICENSE
- License: MIT (full upstream text in `LICENSE`; bundled dependency notices remain in the distribution).

The downloaded files are unchanged.

SHA-256:

```
e6551fcdc32f09d6853b2c5126d18d01d9447e0da618a41a11ebeee0f6c20d54  jspdf.umd.min.js
dc388ec35ff463288cdde3588a36fd4ed12a45deff053243b37309acc9ef583b  LICENSE
```

The site loads this distribution from its own origin only when exporting a PDF.
The export uses jsPDF's drawing and text APIs; optional HTML/SVG conversion dependencies are not used.
No external script source or CSP exception is needed.

To update, verify the current stable release on the upstream project, replace the distribution and license from that version, update this notice and hashes, then exercise a character-sheet download in a browser with external requests blocked.
