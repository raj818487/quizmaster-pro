// Simple script to create placeholder PWA icons
// This creates basic SVG icons that can be converted to PNG
const fs = require("fs");
const path = require("path");

const createSVGIcon = (size, text) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1976d2"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${
    size * 0.3
  }" 
        fill="white" text-anchor="middle" dominant-baseline="middle">QM</text>
</svg>`;
};

// Create SVG icons
const publicDir = path.join(__dirname, "public");

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Create SVG files
fs.writeFileSync(
  path.join(publicDir, "icon-192.svg"),
  createSVGIcon(192, "QM")
);
fs.writeFileSync(
  path.join(publicDir, "icon-512.svg"),
  createSVGIcon(512, "QM")
);

console.log("PWA placeholder icons created!");
console.log("To get proper PNG icons:");
console.log("1. Convert the SVG files to PNG using an online converter");
console.log(
  "2. Or use a tool like Inkscape: inkscape --export-png=icon-192.png icon-192.svg"
);
console.log("3. Replace the SVG files with PNG files");
