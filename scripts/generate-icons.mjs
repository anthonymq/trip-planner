import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#eb6b42"/>
      <stop offset="100%" style="stop-color:#d84f28"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="96" ry="96" fill="url(#bgGrad)"/>
  <text x="256" y="360" font-family="Arial, sans-serif" font-size="320" font-weight="bold" fill="#ffffff" text-anchor="middle">W</text>
</svg>`;

const publicDir = path.join(process.cwd(), 'public');

async function generateIcons() {
  const svgBuffer = Buffer.from(svgContent);
  
  // Generate 192x192 for PWA
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  
  // Generate 512x512 for PWA
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
    
  // Generate 180x180 for apple-touch-icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    
  console.log('Icons generated successfully!');
}

generateIcons().catch(console.error);
